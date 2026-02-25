import { View, Text } from '@tarojs/components'
import { useCallback, useState, useEffect, useRef } from 'react'
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro'
import { orderApi } from '../../services/api'
import './order.less'

export default function OrderPage () {
  // 状态管理
  const [activeStatus, setActiveStatus] = useState('all')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 10
  
  // 用于标记是否是首次加载，避免 useDidShow 和 useEffect 重复调用
  const isFirstLoad = useRef(true)
  // 用于防止重复请求
  const isLoadingRef = useRef(false)

  // 初始化时检查路由参数
  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params
    if (params && params.status) {
      setActiveStatus(params.status)
    }
  }, [])

  // 页面显示时刷新数据（除了首次加载）
  useDidShow(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    // 重新加载第一页
    setPage(1)
    setHasMore(true)
    fetchOrders(1)
  })

  // 触底加载更多
  useReachBottom(() => {
    if (!isLoadingRef.current && hasMore) {
      fetchOrders(page + 1)
    }
  })

  // 当状态变化时获取订单数据
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setOrders([])
    fetchOrders(1)
  }, [activeStatus])

  // 映射本地状态到API状态
  const mapStatusToApi = useCallback((status) => {
    const statusMap = {
      'pending_pay': 'pending',
      'pending_confirm': 'paid',
      'pending_checkin': 'paid',
      'completed': 'completed'
    }
    return statusMap[status] || status
  }, [])

  // 获取订单数据
  const fetchOrders = useCallback(async (pageNum = 1) => {
    if (isLoadingRef.current) return
    
    try {
      isLoadingRef.current = true
      setLoading(true)
      
      // 调用后端API获取订单
      const response = await orderApi.getOrders({
        status: activeStatus === 'all' ? '' : mapStatusToApi(activeStatus),
        page: pageNum,
        page_size: pageSize
      })
      
      if (response.code === 0 && response.data) {
        // 兼容不同的数据结构: response.data.list 或 response.data.bookings
        const newOrders = response.data.bookings || response.data.list || []
        
        // 判断是否还有更多数据
        if (newOrders.length < pageSize) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }

        if (pageNum === 1) {
          setOrders(newOrders)
        } else {
          setOrders(prev => [...prev, ...newOrders])
        }
        setPage(pageNum)
      } else {
        // API请求失败
        console.log('API请求失败')
        if (pageNum === 1) {
          setOrders([])
        }
        
        // 只在登录失效时显示提示
        if (response.code === 4008) {
          Taro.showToast({
            title: response.msg || '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          })
          setTimeout(() => {
            Taro.navigateTo({
              url: '/pages/login/login'
            })
          }, 1500)
        }
      }
    } catch (error) {
      console.error('获取订单失败:', error)
      
      // 网络错误处理
      if (pageNum === 1) {
        setOrders([])
      }
      
      // 只在登录失效时显示提示
      if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        Taro.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none',
          duration: 2000
        })
        setTimeout(() => {
          Taro.navigateTo({
            url: '/pages/login/login'
          })
        }, 1500)
      }
    } finally {
      setLoading(false)
      isLoadingRef.current = false
      setRefreshing(false)
    }
  }, [activeStatus, mapStatusToApi])

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    setHasMore(true)
    await fetchOrders(1)
  }

  // 处理订单操作
  const handleOrderAction = useCallback(async (orderId, action, e, orderStatus) => {
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    console.log('订单操作:', orderId, action, orderStatus)
    if (action === 'pay') {
      // 跳转到支付页面
      Taro.navigateTo({
        url: `/pages/payment/index?bookingId=${orderId}`
      })
    } else if (action === 'view') {
      // 根据订单状态决定跳转路径
      if (orderStatus === 'cancelled') {
        // 已取消订单跳转到订单详情页
        Taro.navigateTo({
          url: `/pages/order-detail/index?bookingId=${orderId}`
        })
      } else {
        // 其他状态跳转到支付页面（作为订单详情页）
        Taro.navigateTo({
          url: `/pages/payment/index?bookingId=${orderId}`
        })
      }
    } else if (action === 'cancel') {
      // 取消订单
      Taro.showModal({
        title: '取消订单',
        content: '确定要取消这个订单吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await orderApi.cancelOrder(orderId)
              Taro.showToast({
                title: '订单已取消',
                icon: 'success'
              })
              // 重新获取订单列表
              fetchOrders()
              // 订单取消后，通知优惠券页面刷新优惠券列表
              Taro.eventCenter.trigger('refreshCoupons')
            } catch (error) {
              Taro.showToast({
                title: error.message || '取消订单失败',
                icon: 'none'
              })
            }
          }
        }
      })
    }
  }, [fetchOrders])

  return (
    <View className='order-page'>
      <View className='top-nav'>
        <View className='nav-left'>
          <Text className='nav-title'>我的订单</Text>
        </View>
      </View>
      
      <View className='order-status-filter'>
        <View className='order-status-scroll'>
          <View 
            className={`filter-item ${activeStatus === 'all' ? 'active' : ''}`}
            onClick={() => setActiveStatus('all')}
          >
            <Text className='filter-text'>全部</Text>
            <View className='filter-indicator' />
          </View>
          <View 
            className={`filter-item ${activeStatus === 'pending_pay' ? 'active' : ''}`}
            onClick={() => setActiveStatus('pending_pay')}
          >
            <Text className='filter-text'>待支付</Text>
            <View className='filter-indicator' />
          </View>
          <View 
            className={`filter-item ${activeStatus === 'pending_confirm' ? 'active' : ''}`}
            onClick={() => setActiveStatus('pending_confirm')}
          >
            <Text className='filter-text'>待确认</Text>
            <View className='filter-indicator' />
          </View>
          <View 
            className={`filter-item ${activeStatus === 'pending_checkin' ? 'active' : ''}`}
            onClick={() => setActiveStatus('pending_checkin')}
          >
            <Text className='filter-text'>待入住</Text>
            <View className='filter-indicator' />
          </View>
          <View 
            className={`filter-item ${activeStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveStatus('completed')}
          >
            <Text className='filter-text'>已完成</Text>
            <View className='filter-indicator' />
          </View>
          <View 
            className={`filter-item ${activeStatus === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveStatus('cancelled')}
          >
            <Text className='filter-text'>已取消</Text>
            <View className='filter-indicator' />
          </View>
        </View>
      </View>
      
      <View className='order-list'>
        {orders.length === 0 && loading ? (
          <View className='loading-container'>
            <Text className='loading-text'>正在加载订单信息...</Text>
          </View>
        ) : orders.length > 0 ? (
          <>
            {orders.map(order => {
              const isPending = order.status === 'pending' || order.status === 'pending_payment'
              const statusClass = isPending
                ? 'status-pending'
                : order.status === 'paid'
                  ? 'status-paid'
                  : order.status === 'completed'
                    ? 'status-completed'
                    : order.status === 'cancelled'
                      ? 'status-cancelled'
                      : ''
              return (
                <View key={order.id} className='order-item' onClick={(e) => handleOrderAction(order.id, 'view', e, order.status)}>
                  <View className='order-item-header'>
                    <Text className='hotel-name'>{order.hotel_name || order.hotel?.name || '未知酒店'}</Text>
                    <Text className={`order-status ${statusClass}`}>
                      {isPending && '待支付'}
                      {order.status === 'paid' && '已付款'}
                      {order.status === 'completed' && '已完成'}
                      {order.status === 'cancelled' && '已取消'}
                    </Text>
                  </View>
                  <View className='order-item-body'>
                    <View className='order-date-row'>
                      <Text className='order-date-label'>日期</Text>
                      <Text className='order-date'>
                        {order.check_in_date} - {order.check_out_date}
                      </Text>
                    </View>
                  </View>
                  <View className='order-item-footer'>
                    {isPending && (
                      <>
                        <View 
                          className='order-btn cancel-btn' 
                          onClick={(e) => handleOrderAction(order.id, 'cancel', e, order.status)}
                        >
                          取消订单
                        </View>
                        <View 
                          className='order-btn confirm-btn' 
                          onClick={(e) => handleOrderAction(order.id, 'pay', e, order.status)}
                        >
                          立即支付
                        </View>
                      </>
                    )}
                    {order.status === 'paid' && (
                      <>
                        <View 
                          className='order-btn cancel-btn' 
                          onClick={(e) => handleOrderAction(order.id, 'cancel', e, order.status)}
                        >
                          取消订单
                        </View>
                        <View 
                          className='order-btn view-btn' 
                          onClick={(e) => handleOrderAction(order.id, 'view', e, order.status)}
                        >
                          查看详情
                        </View>
                      </>
                    )}
                    {order.status === 'completed' && (
                      <View className='order-btn view-btn' onClick={(e) => handleOrderAction(order.id, 'view', e, order.status)}>
                        查看详情
                      </View>
                    )}
                    {order.status === 'cancelled' && (
                      <View className='order-btn view-btn' onClick={(e) => handleOrderAction(order.id, 'view', e, order.status)}>
                        查看详情
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            <View className='list-footer'>
              {loading && <Text>加载中...</Text>}
              {!loading && !hasMore && <Text>没有更多了</Text>}
            </View>
          </>
        ) : (
          <View className='empty-container'>
            <Text className='empty-text'>暂无订单记录</Text>
            <Text className='empty-subtext'>您还没有任何订单</Text>
            <View className='empty-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
              <Text>去预订酒店</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
