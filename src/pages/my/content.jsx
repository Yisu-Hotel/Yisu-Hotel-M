import { View, Text, Image } from '@tarojs/components'
import { useCallback, useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { userApi, orderApi } from '../../services/api'
import './my.less'

export default function MyPage () {
  // 状态管理
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [pendingPayCount, setPendingPayCount] = useState(0)

  // 获取待支付订单数量
  const fetchPendingPayCount = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPendingPayCount(0)
        return
      }
      
      const response = await orderApi.getOrders({ status: 'pending' })
      if (response.code === 0 && response.data) {
        const pendingOrders = response.data.list || []
        setPendingPayCount(pendingOrders.length)
      } else {
        setPendingPayCount(0)
      }
    } catch (error) {
      console.error('获取待支付订单数量失败:', error)
      setPendingPayCount(0)
    }
  }

  const resetLoginState = () => {
    setIsLoggedIn(false)
    setUserInfo(null)
    setPendingPayCount(0)
  }

  const checkLoginStatus = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      resetLoginState()
      return
    }

    const response = await userApi.getProfile()
    if (response.code === 0 && response.data) {
      const profile = response.data.user || response.data
      setIsLoggedIn(true)
      setUserInfo(profile)
      fetchPendingPayCount()
      return
    }

    resetLoginState()
  }

  useDidShow(() => {
    checkLoginStatus()
  })

  // 初始化时检查登录状态并获取用户信息
  useEffect(() => {
    checkLoginStatus()
    
    // 监听登录成功事件
    const handleLoginSuccess = (data) => {
      console.log('收到登录成功事件:', data)
      setIsLoggedIn(true)
      setUserInfo(data.userInfo)
      // 获取待支付订单数量
      fetchPendingPayCount()
    }
    
    Taro.eventCenter.on('userLoggedIn', handleLoginSuccess)
    
    // 清理事件监听器
    return () => {
      Taro.eventCenter.off('userLoggedIn', handleLoginSuccess)
    }
  }, [])

  // 处理菜单点击
  const handleMenuClick = useCallback((menu) => {
    console.log('点击菜单:', menu)
    if (menu === 'favorites') {
      // 跳转到收藏页面
      Taro.navigateTo({
        url: '/pages/favorites/favorites'
      })
    } else if (menu === 'coupons') {
      // 跳转到优惠券页面
      Taro.navigateTo({
        url: '/pages/coupons/coupons'
      })
    } else if (menu === 'settings') {
      // 跳转到设置页面
      Taro.navigateTo({
        url: '/pages/settings/settings'
      })
    } else if (menu === 'history') {
      // 跳转到历史页面
      Taro.navigateTo({
        url: '/pages/history/history'
      })
    } else if (menu === 'ai_assistant') {
      // 跳转到AI助手页面
      Taro.navigateTo({
        url: '/pages/ai-assistant/ai-assistant'
      })
    } else if (menu === 'customer_service') {
      // 跳转到客服中心页面
      Taro.redirectTo({
        url: '/pages/customer-service/customer-service'
      })
    } else if (menu === 'help_center') {
      // 跳转到帮助中心页面
      Taro.navigateTo({
        url: '/pages/help-center/help-center'
      })
    }
  }, [])

  // 处理订单状态点击
  const handleOrderStatusClick = useCallback((status) => {
    console.log('点击订单状态:', status)
    Taro.switchTab({
      url: `/pages/order/order?status=${status}`
    })
  }, [])

  // 处理登录/注册点击
  const handleLoginRegisterClick = useCallback(() => {
    Taro.navigateTo({
      url: '/pages/register/register'
    })
  }, [])
  return (
    <View className='my-page'>
      <View className='my-header'>
        {isLoggedIn && userInfo ? (
          <View className='user-info-section' onClick={() => Taro.navigateTo({ url: '/pages/settings/settings' })}>
            <Image 
              className='user-avatar' 
              src={userInfo.avatar || userInfo.profile?.avatar || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20avatar%20portrait%20placeholder&image_size=square'} 
            />
            <View className='user-info'>
              <Text className='user-name'>{userInfo.nickname || userInfo.profile?.nickname || userInfo.phone || '用户'}</Text>
            {userInfo.phone || userInfo.profile?.phone ? (
              <Text className='user-phone'>{userInfo.phone || userInfo.profile?.phone}</Text>
            ) : (
              <Text className='user-id'>已登录</Text>
            )}
            </View>
            <View className='user-arrow'>›</View>
          </View>
        ) : (
          <View className='user-info-section' onClick={() => Taro.navigateTo({ url: '/pages/login/login' })}>
            <Image 
              className='user-avatar' 
              src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20avatar%20portrait%20placeholder&image_size=square' 
            />
            <View className='user-info'>
              <Text className='user-name'>登录/注册</Text>
            <Text className='user-id'>点击登录享受更多权益</Text>
            </View>
            <View className='user-arrow'>›</View>
          </View>
        )}
      </View>

      <View className='my-content'>
        <View className='order-section'>
          <View className='section-header'>
            <Text className='section-title'>我的订单</Text>
            <View className='section-more' onClick={() => Taro.switchTab({ url: '/pages/order/order' })}>
              <Text className='more-text'>全部订单</Text>
              <Text className='more-arrow'>›</Text>
            </View>
          </View>
          
          <View className='order-status-list'>
            <View className='order-status-item' onClick={() => handleOrderStatusClick('pending_pay')}>
              <View className='order-status-icon'>💳</View>
              <Text className='order-status-text'>待支付</Text>
              {pendingPayCount > 0 && (
                <View className='order-status-badge'>{pendingPayCount}</View>
              )}
            </View>
            <View className='order-status-item' onClick={() => handleOrderStatusClick('pending_confirm')}>
              <View className='order-status-icon'>⏳</View>
              <Text className='order-status-text'>待确认</Text>
            </View>
            <View className='order-status-item' onClick={() => handleOrderStatusClick('pending_checkin')}>
              <View className='order-status-icon'>🏨</View>
              <Text className='order-status-text'>待入住</Text>
            </View>
            <View className='order-status-item' onClick={() => handleOrderStatusClick('completed')}>
              <View className='order-status-icon'>✅</View>
              <Text className='order-status-text'>已完成</Text>
            </View>
          </View>
        </View>

        <View className='menu-section'>
          <View className='menu-item' onClick={() => handleMenuClick('favorites')}>
            <View className='menu-icon'>❤️</View>
            <Text className='menu-text'>我的收藏</Text>
            <View className='menu-arrow'>›</View>
          </View>
          <View className='menu-item' onClick={() => handleMenuClick('coupons')}>
            <View className='menu-icon'>🎫</View>
            <Text className='menu-text'>优惠券</Text>
            <View className='menu-arrow'>›</View>
          </View>
          <View className='menu-item' onClick={() => handleMenuClick('history')}>
            <View className='menu-icon'>🕐</View>
            <Text className='menu-text'>浏览历史</Text>
            <View className='menu-arrow'>›</View>
          </View>
          <View className='menu-item' onClick={() => handleMenuClick('settings')}>
            <View className='menu-icon'>⚙️</View>
            <Text className='menu-text'>设置</Text>
            <View className='menu-arrow'>›</View>
          </View>
        </View>

        <View className='help-section'>
          <View className='help-item help-item-outline' onClick={() => handleMenuClick('customer_service')}>
            <Text className='help-icon'>🎧</Text>
            <Text className='help-text'>客服中心</Text>
          </View>
          <View className='help-item help-item-outline' onClick={() => handleMenuClick('help_center')}>
            <Text className='help-icon'>❓</Text>
            <Text className='help-text'>帮助中心</Text>
          </View>
          <View className='help-item help-item-outline' onClick={() => handleMenuClick('ai_assistant')}>
            <Text className='help-icon'>✨</Text>
            <Text className='help-text'>AI助手</Text>
          </View>
        </View>

        <View className='version-section'>
          <Text className='version-text'>版本 1.0.0</Text>
        </View>
      </View>
    </View>
  )
}
