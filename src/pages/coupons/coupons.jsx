import { View, Text, ScrollView } from '@tarojs/components'
import { useCallback, useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { couponApi, mockLogin } from '../../services/api'
import './coupons.less'

export default function CouponsPage () {
  // 状态管理
  const [myCoupons, setMyCoupons] = useState({
    available: [],
    used: [],
    expired: []
  })
  const [pushCoupons, setPushCoupons] = useState({
    limited: [],
    bank: [],
    selected: []
  })
  const [activeTab, setActiveTab] = useState('available')
  const [loading, setLoading] = useState(false)
  

  const refreshOnShow = useCallback(async () => {
    await mockLogin()
    await fetchCoupons()
  }, [activeTab])

  useDidShow(() => {
    refreshOnShow()
  })

  // 初始化时获取优惠券数据
  useEffect(() => {
    async function init() {
      // 模拟登录，获取测试token
      await mockLogin()
      // 获取优惠券数据
      fetchCoupons()
    }
    init()
    
    // 监听支付成功后刷新优惠券的事件
    const refreshCouponsListener = Taro.eventCenter.on('refreshCoupons', () => {
      console.log('收到刷新优惠券事件，开始刷新优惠券列表...')
      fetchCoupons()
    })
    
    // 清理函数
    return () => {
      Taro.eventCenter.off('refreshCoupons', refreshCouponsListener)
    }
  }, [])

  // 处理标签切换
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
  }, [])

  // 过滤酒店相关的优惠券
  const filterHotelCoupons = (coupons) => {
    if (!Array.isArray(coupons)) {
      return []
    }
    const hotelKeywords = ['酒店', '住宿', '房费', '入住', '预订']
    return coupons.filter(coupon => {
      // 对于推送的优惠券，我们不过滤，因为后端已经返回了酒店相关的优惠券
      // 对于普通优惠券，我们过滤出酒店相关的优惠券
      if (coupon.discount || coupon.limit || coupon.remain) {
        return true
      }
      const couponText = (coupon.name || coupon.title || '') + (coupon.description || '') + (coupon.scope || '')
      return hotelKeywords.some(keyword => couponText.includes(keyword))
    })
  }

  // 映射后端优惠券数据到前端格式
  const mapCouponData = (coupon) => {
    return {
      id: coupon.id || coupon.coupon_id,
      name: coupon.name || coupon.title,
      value: coupon.value || coupon.discount_value,
      min_spend: coupon.min_spend || coupon.min_order_amount,
      expire_date: coupon.expire_date || coupon.valid_until,
      status: coupon.status,
      description: coupon.description
    }
  }
  
  // 检查用户是否已经领取过当前优惠券
  const hasReceivedCoupon = (couponId) => {
    // 从本地存储中获取用户已领取的优惠券
    const userCoupons = Taro.getStorageSync('userCoupons') || []
    // 检查当前优惠券是否在用户已领取的优惠券列表中
    return userCoupons.some(coupon => coupon.id === couponId)
  }

  // 获取优惠券数据
  const fetchCoupons = async () => {
    try {
      setLoading(true)
      console.log('开始获取优惠券数据...')
      
      // 调用后端API获取优惠券列表
      console.log('调用couponApi.getCoupons()')
      // 使用type: 'all'来获取所有优惠券，这样就可以包含用户已领取的优惠券了
      const type = 'all'
      console.log('传递的type参数:', type)
      const response = await couponApi.getCoupons({ type })
      console.log('API响应:', response)
      
      // 检查后端响应数据
      if (response.code !== 0 || !response.data) {
        console.log('API返回错误或无数据:', response)
        // 后端返回错误或无数据，设置为空数组
        setMyCoupons({ available: [], used: [], expired: [] })
        setPushCoupons({ limited: [], bank: [], selected: [] })
        setLoading(false)
        return
      }
      
      // 处理我的优惠券
      if (response.code === 0 && response.data) {
        console.log('API返回成功，数据:', response.data)
        // 按状态分类优惠券
        const available = []
        const used = []
        const expired = []
        
        // 确保coupons是一个数组
        const couponsList = Array.isArray(response.data.coupons) ? response.data.coupons : []
        console.log('优惠券列表:', couponsList)
        console.log('优惠券数量:', couponsList.length)
        
        const hotelCoupons = couponsList
        console.log('优惠券数量(全部):', hotelCoupons.length)
        
        // 如果没有优惠券数据，尝试从response.data中获取
        if (hotelCoupons.length === 0 && response.data) {
          console.log('从response.data中获取优惠券数据')
          if (Array.isArray(response.data)) {
            const dataCoupons = response.data
            console.log('从response.data数组中获取的优惠券:', dataCoupons)
            hotelCoupons.push(...dataCoupons)
          } else if (response.data.available) {
            const availableCoupons = Array.isArray(response.data.available) ? response.data.available : []
            console.log('从response.data.available中获取的优惠券:', availableCoupons)
            hotelCoupons.push(...availableCoupons)
          }
        }
        
        hotelCoupons.forEach(coupon => {
          // 映射后端数据到前端格式
          const mappedCoupon = mapCouponData(coupon)
          console.log('映射后的优惠券:', mappedCoupon)
          // 默认设置为可用状态
          const couponWithStatus = {
            ...mappedCoupon,
            status: mappedCoupon.status || 'unused'
          }
          switch (couponWithStatus.status) {
            case 'unused':
            case 'available':
              available.push(couponWithStatus)
              break
            case 'used':
              used.push(couponWithStatus)
              break
            case 'expired':
              expired.push(couponWithStatus)
              break
            default:
              available.push(couponWithStatus)
              break
          }
        })
        
        const myCouponsData = { available, used, expired }
        console.log('分类后的优惠券:', myCouponsData)
        setMyCoupons(myCouponsData)
        
        // 处理推送的优惠券
        let pushCouponsData = { limited: [], bank: [], selected: [] }
        if (response.data.pushCoupons) {
          console.log('推送优惠券数据:', response.data.pushCoupons)
          // 过滤酒店相关的推送优惠券
          const limited = filterHotelCoupons(response.data.pushCoupons.limited || [])
          const bank = filterHotelCoupons(response.data.pushCoupons.bank || [])
          const selected = filterHotelCoupons(response.data.pushCoupons.selected || [])
          console.log('过滤后的推送优惠券:', { limited, bank, selected })
          pushCouponsData = { limited, bank, selected }
        } else {
          // 如果没有pushCoupons字段，尝试从coupons字段中构造推送优惠券数据
          console.log('从coupons字段构造推送优惠券数据')
          const couponsList = Array.isArray(response.data.coupons) ? response.data.coupons : []
          const hotelCoupons = filterHotelCoupons(couponsList)
          
          // 构造推送优惠券数据
          const limited = hotelCoupons.map(coupon => ({
            id: coupon.id || coupon.coupon_id,
            name: coupon.name || coupon.title,
            value: coupon.value || coupon.discount_value,
            discount: coupon.value || coupon.discount_value,
            description: coupon.description,
            expire_date: coupon.expire_date || coupon.valid_until,
            limit: `满${coupon.min_spend || coupon.min_order_amount}可用`,
            remain: '100%'
          }))
          
          const bank = []
          const selected = limited
          
          pushCouponsData = { limited, bank, selected }
        }
        
        setPushCoupons(pushCouponsData)
      } else {
        // 后端返回错误或无数据，设置为空数组
        setMyCoupons({ available: [], used: [], expired: [] })
        setPushCoupons({ limited: [], bank: [], selected: [] })
      }
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      // 网络错误处理，设置为空数组
      setMyCoupons({ available: [], used: [], expired: [] })
      setPushCoupons({ limited: [], bank: [], selected: [] })
    } finally {
      setLoading(false)
    }
  }

  // 处理优惠券点击
  const handleCouponClick = useCallback(async (coupon) => {
    console.log('========== 开始领取优惠券流程 ==========')
    console.log('点击了优惠券:', coupon)
    
    try {
      // 显示加载提示
      console.log('显示加载提示')
      Taro.showLoading({
        title: '领取中...',
        mask: true
      })
      
      // 检查coupon.id是否存在
      if (!coupon.id && !coupon.coupon_id) {
        console.error('优惠券ID不存在:', coupon)
        Taro.showToast({
          title: '优惠券信息错误',
          icon: 'none'
        })
        Taro.hideLoading()
        return
      }
      
      // 获取优惠券ID
      const couponId = coupon.id || coupon.coupon_id
      console.log('准备调用API领取优惠券，couponId:', couponId)
      
      // 调用后端API领取优惠券
      const response = await couponApi.receiveCoupon(couponId)
      console.log('领取优惠券API响应:', response)
      
      // 处理领取结果
      if (response.code === 0) {
        // 领取成功
        console.log('领取成功')
        Taro.showToast({
          title: '优惠券领取成功',
          icon: 'success'
        })
        
        // 手动添加一张优惠券到 myCoupons.available 数组中
        console.log('手动添加优惠券到 myCoupons.available 数组中')
        const newCoupon = {
          id: coupon.id,
          name: coupon.name,
          value: coupon.value,
          min_spend: coupon.min_spend || 100,
          expire_date: coupon.expire_date || '2026-12-31',
          status: 'available',
          description: coupon.description
        }
        setMyCoupons(prev => ({
          ...prev,
          available: [newCoupon, ...prev.available]
        }))
        
        // 更新 pushCoupons 中对应优惠券的 userStatus 为 claimed
        console.log('更新 pushCoupons 中对应优惠券的 userStatus')
        setPushCoupons(prev => ({
          ...prev,
          limited: prev.limited.map(item => 
            item.id === coupon.id ? { ...item, userStatus: 'claimed' } : item
          ),
          selected: prev.selected.map(item => 
            item.id === coupon.id ? { ...item, userStatus: 'claimed' } : item
          )
        }))
        
        // 将优惠券信息保存到本地存储中
        console.log('将优惠券信息保存到本地存储中')
        const userCoupons = Taro.getStorageSync('userCoupons') || []
        userCoupons.push(newCoupon)
        Taro.setStorageSync('userCoupons', userCoupons)
        
        // 不需要调用 fetchCoupons()，因为后端返回的数据可能不包含已领取的优惠券
        // 我们已经手动添加了优惠券到 myCoupons.available 数组中
      } else {
        // 领取失败
        console.log('领取失败:', response.msg)
        Taro.showToast({
          title: response.msg || '优惠券领取失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('领取优惠券发生错误:', error)
      Taro.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    } finally {
      // 隐藏加载提示
      console.log('隐藏加载提示')
      Taro.hideLoading()
      console.log('========== 领取优惠券流程结束 ==========')
    }
  }, [])

  // 获取当前标签的优惠券列表
  const getCurrentCoupons = () => {
    switch (activeTab) {
      case 'available':
        return myCoupons.available
      case 'used':
        return myCoupons.used
      case 'expired':
        return myCoupons.expired
      default:
        return []
    }
  }

  return (
    <View className='coupons-page'>
      {/* 返回按钮 */}
      <View className='back-button' onClick={() => Taro.navigateTo({ url: '/pages/my/my' })}>
        <Text className='back-icon'>←</Text>
        <Text className='back-text'>返回</Text>
      </View>
      
      {/* 页面标题 */}
      <View className='page-header'>
        <Text className='page-title'>优惠券</Text>
      </View>
      
      {/* 下拉刷新容器 */}
      <ScrollView
        style={{ flex: 1 }}
        scrollY
        refresherEnabled
        refresherTriggered={loading}
        onRefresherRefresh={fetchCoupons}
        refresherBackgroundColor='#f5f5f5'
        refresherThreshold={45}
      >
        {/* 我的优惠券部分 */}
        <View className='my-coupons-section'>
          <View className='section-title'>
            <Text>我的优惠券</Text>
          </View>
          <View className='my-coupons-content'>
            {/* 标签切换 */}
            <View className='coupon-tabs'>
              <View 
                className={`tab-item ${activeTab === 'available' ? 'active' : ''}`}
                onClick={() => handleTabChange('available')}
              >
                <Text>可用 ({myCoupons.available.length})</Text>
              </View>
              <View 
                className={`tab-item ${activeTab === 'used' ? 'active' : ''}`}
                onClick={() => handleTabChange('used')}
              >
                <Text>已使用 ({myCoupons.used.length})</Text>
              </View>
              <View 
                className={`tab-item ${activeTab === 'expired' ? 'active' : ''}`}
                onClick={() => handleTabChange('expired')}
              >
                <Text>已过期 ({myCoupons.expired.length})</Text>
              </View>
            </View>
            
            {/* 优惠券列表 */}
            <View className='coupon-list'>
              {getCurrentCoupons().length > 0 ? (
                getCurrentCoupons().map((coupon) => (
                  <View 
                    key={coupon.id} 
                    className={`coupon-item ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-disabled' : ''}`}
                    style={{ pointerEvents: coupon.status === 'used' || coupon.status === 'expired' ? 'none' : 'auto' }}
                  >
                    <View className='coupon-left'>
                      <Text className={`coupon-value ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-value-disabled' : ''}`}>¥{coupon.value}</Text>
                      <Text className={`coupon-min-spend ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-text-disabled' : ''}`}>满{coupon.min_spend}可用</Text>
                    </View>
                    <View className='coupon-right'>
                      <Text className={`coupon-name ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-text-disabled' : ''}`}>{coupon.name}</Text>
                      <Text className={`coupon-desc ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-text-disabled' : ''}`}>{coupon.description}</Text>
                      <Text className={`coupon-expire ${coupon.status === 'used' || coupon.status === 'expired' ? 'coupon-text-disabled' : ''}`}>有效期至: {coupon.expire_date}</Text>
                    </View>
                    {coupon.status === 'used' && (
                      <View className='coupon-status-tag used-tag'>
                        <Text className='status-text'>已使用</Text>
                      </View>
                    )}
                    {coupon.status === 'expired' && (
                      <View className='coupon-status-tag expired-tag'>
                        <Text className='status-text'>已过期</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View className='empty-coupons'>
                  <View className='empty-icon'>📮</View>
                  <Text className='empty-text'>暂无优惠券记录</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* 限时抢部分 */}
        <View className='limited-section'>
          <View className='section-title'>
            <Text>限时抢</Text>
          </View>
          
          {/* 优惠券列表 */}
          {pushCoupons.limited.map((coupon, index) => {
            // 根据 userStatus 判断优惠券状态
            const isClaimed = coupon.userStatus === 'claimed' || coupon.userStatus === 'used'
            const isUnclaimed = coupon.userStatus === 'unclaimed'
            
            // 处理按钮点击事件
            const handleButtonClick = () => {
              if (isClaimed) {
                // 已领取的优惠券，直接提示
                Taro.showToast({
                  title: '该优惠券已领取，不可重复领取',
                  icon: 'none'
                })
              } else {
                // 未领取的优惠券，执行领取逻辑
                handleCouponClick(coupon)
              }
            }
            
            return (
              <View key={coupon.id} className='selected-item'>
                <View className='selected-left'>
                  <View className='selected-value'>
                    {coupon.value ? (
                      <>
                        <Text className='value-number'>{coupon.value}</Text>
                      </>
                    ) : (
                      <>
                        <Text className='value-number'>{coupon.discount}</Text>
                      </>
                    )}
                    {coupon.limit && <Text className='value-limit'>{coupon.limit}</Text>}
                  </View>
                  <Text className='selected-name'>{coupon.name}</Text>
                  <Text className='selected-expire'>{coupon.expire_date}前</Text>
                </View>
                <View className='selected-right'>
                  <View className='selected-remain'>
                    <Text className='remain-text'>剩余</Text>
                    <Text className='remain-percent'>{coupon.remain}</Text>
                  </View>
                  {isClaimed ? (
                    <View className='selected-btn disabled' onClick={handleButtonClick}>已领取</View>
                  ) : (
                    <View className='selected-btn' onClick={handleButtonClick}>马上抢</View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
        
        {/* 领好券部分 */}
        <View className='selected-section'>
          <View className='section-title'>
            <Text>领好券</Text>
          </View>
          
          {/* 优惠券列表 */}
          {pushCoupons.selected.map((coupon, index) => {
            // 根据 userStatus 判断优惠券状态
            const isClaimed = coupon.userStatus === 'claimed' || coupon.userStatus === 'used'
            const isUnclaimed = coupon.userStatus === 'unclaimed'
            
            // 处理按钮点击事件
            const handleButtonClick = () => {
              if (isClaimed) {
                // 已领取的优惠券，直接提示
                Taro.showToast({
                  title: '该优惠券已领取，不可重复领取',
                  icon: 'none'
                })
              } else {
                // 未领取的优惠券，执行领取逻辑
                handleCouponClick(coupon)
              }
            }
            
            return (
              <View key={coupon.id} className='selected-item'>
                <View className='selected-left'>
                  <View className='selected-value'>
                    {coupon.value ? (
                      <>
                        <Text className='value-number'>{coupon.value}</Text>
                      </>
                    ) : (
                      <>
                        <Text className='value-number'>{coupon.discount}</Text>
                      </>
                    )}
                    {coupon.limit && <Text className='value-limit'>{coupon.limit}</Text>}
                  </View>
                  <Text className='selected-name'>{coupon.name}</Text>
                  <Text className='selected-expire'>{coupon.expire_date}前</Text>
                </View>
                <View className='selected-right'>
                  <View className='selected-remain'>
                    <Text className='remain-text'>剩余</Text>
                    <Text className='remain-percent'>{coupon.remain}</Text>
                  </View>
                  {isClaimed ? (
                    <View className='selected-btn disabled' onClick={handleButtonClick}>已领取</View>
                  ) : (
                    <View className='selected-btn' onClick={handleButtonClick}>马上领</View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
