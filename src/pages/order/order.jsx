import { View, Text, Button } from '@tarojs/components'
import { useCallback, useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { orderApi } from '../../services/api'
import './order.less'

export default function OrderPage () {
  // 状态管理
  const [activeStatus, setActiveStatus] = useState('all')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 初始化时检查路由参数
  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params
    if (params && params.status) {
      setActiveStatus(params.status)
    }
  }, [])

  // 当状态变化时获取订单数据
  useEffect(() => {
    try {
      fetchOrders()
    } catch (error) {
      console.error('初始化订单数据失败:', error)
    }
  }, [activeStatus])

  // 获取订单数据
  const fetchOrders = async () => {
    try {
      setLoading(true)
      
      // 调用后端API获取订单
      const response = await orderApi.getOrders({
        status: activeStatus === 'all' ? undefined : activeStatus
      })
      
      if (response.code === 0 && response.data) {
        setOrders(response.data.orders || [])
      } else {
        Taro.showToast({
          title: response.message || '获取订单失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取订单失败:', error)
      Taro.showToast({
        title: error.message || '获取订单失败，请检查网络连接',
        icon: 'none'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
  }

  // 处理订单操作
  const handleOrderAction = useCallback((orderId, action) => {
    console.log('订单操作:', orderId, action)
    if (action === 'pay') {
      // 跳转到支付页面
      Taro.navigateTo({
        url: `/pages/payment/index?orderId=${orderId}`
      })
    } else if (action === 'view') {
      // 跳转到酒店详情页面
      Taro.navigateTo({
        url: `/pages/hotel-detail/index?hotelId=${orderId}`
      })
    }
  }, [])

  return (
    <View className='order-page'>
      <View className='order-header'>
        <Text className='order-header-title'>我的订单</Text>
      </View>
      
      {/* 订单状态过滤 */}
      <View className='order-status-filter'>
        <View 
          className={`filter-item ${activeStatus === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatus('all')}
        >
          <Text>全部</Text>
        </View>
        <View 
          className={`filter-item ${activeStatus === 'pending_pay' ? 'active' : ''}`}
          onClick={() => setActiveStatus('pending_pay')}
        >
          <Text>待支付</Text>
        </View>
        <View 
          className={`filter-item ${activeStatus === 'pending_confirm' ? 'active' : ''}`}
          onClick={() => setActiveStatus('pending_confirm')}
        >
          <Text>待确认</Text>
        </View>
        <View 
          className={`filter-item ${activeStatus === 'pending_checkin' ? 'active' : ''}`}
          onClick={() => setActiveStatus('pending_checkin')}
        >
          <Text>待入住</Text>
        </View>
        <View 
          className={`filter-item ${activeStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveStatus('completed')}
        >
          <Text>已完成</Text>
        </View>
      </View>
      
      {/* 订单列表 */}
      <View className='order-list'>
        {loading && !refreshing ? (
          <View className='loading-container'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        ) : orders.length > 0 ? (
          orders.map(order => (
            <View key={order.id} className='order-item'>
              <View className='order-item-header'>
                <Text className='hotel-name'>{order.hotel?.name || '未知酒店'}</Text>
                <Text className={`order-status ${order.status === 'pending_confirm' ? 'status-pending' : ''}`}>
                  {order.status === 'pending_pay' && '待支付'}
                  {order.status === 'pending_confirm' && '待确认'}
                  {order.status === 'pending_checkin' && '待入住'}
                  {order.status === 'completed' && '已完成'}
                </Text>
              </View>
              
              <View className='order-item-body'>
                <Text className='order-date'>
                  {order.check_in_date} - {order.check_out_date}
                </Text>
                <Text className='order-price'>¥{order.total_price}/晚</Text>
              </View>
              
              <View className='order-item-footer'>
                {order.status === 'pending_pay' && (
                  <>
                    <View 
                      className='order-btn cancel-btn' 
                      onClick={() => handleOrderAction(order.id, 'cancel')}
                    >
                      取消订单
                    </View>
                    <View 
                      className='order-btn confirm-btn' 
                      onClick={() => handleOrderAction(order.id, 'pay')}
                    >
                      立即支付
                    </View>
                  </>
                )}
                {order.status === 'pending_confirm' && (
                  <>
                    <View 
                      className='order-btn cancel-btn' 
                      onClick={() => handleOrderAction(order.id, 'cancel')}
                    >
                      取消订单
                    </View>
                    <View 
                      className='order-btn view-btn' 
                      onClick={() => handleOrderAction(order.id, 'view')}
                    >
                      查看详情
                    </View>
                  </>
                )}
                {order.status === 'pending_checkin' && (
                  <View className='order-btn view-btn' onClick={() => handleOrderAction(order.id, 'view')}>
                    查看详情
                  </View>
                )}
                {order.status === 'completed' && (
                  <View className='order-btn view-btn' onClick={() => handleOrderAction(order.id, 'view')}>
                    查看详情
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className='empty-container'>
            <Text className='empty-text'>暂无订单</Text>
            <View className='empty-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
              <Text>去预订</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}