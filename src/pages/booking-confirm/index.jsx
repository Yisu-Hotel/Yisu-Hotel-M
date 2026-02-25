import { useState, useEffect } from 'react'
import { View, Text, Button, Input, ScrollView } from '@tarojs/components'
import { AtModal, AtIcon } from 'taro-ui'
import Taro from '@tarojs/taro'
import { bookingApi, hotelApi, couponApi } from '../../services/api'
import './index.less'

const BookingConfirm = () => {
  const [bookingInfo, setBookingInfo] = useState({
    hotelName: '',
    checkInDate: '',
    checkOutDate: '',
    nights: '1晚',
    roomType: '',
    bedInfo: '',
    breakfast: '无早餐',
    freeCancel: '',
    immediateConfirm: true,
    remainingRooms: 1,
    price: {
      original: 0,
      discount: 0,
      coupon: 0,
      final: 0,
      points: 0
    }
  })

  const [guestInfo, setGuestInfo] = useState({
    name: '', 
    phone: ''
  })

  const [specialRequests, setSpecialRequests] = useState([
    { id: 1, name: '吸烟偏好', selected: false },
    { id: 2, name: '电梯远近', selected: false }
  ])

  const [loading, setLoading] = useState(false)
  const [hotelId, setHotelId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [fetchingData, setFetchingData] = useState(true)
  
  // 优惠券相关状态
  const [coupons, setCoupons] = useState([])
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [showCouponModal, setShowCouponModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true)
        const routerParams = Taro.getCurrentInstance().router?.params || {}
        const cachedParams = Taro.getStorageSync('bookingConfirmPayload') || {}
        if (cachedParams && Object.keys(cachedParams).length > 0) {
          Taro.removeStorageSync('bookingConfirmPayload')
        }
        const mergedParams = { ...routerParams, ...cachedParams }
        const {
          hotelId,
          roomId,
          checkInDate,
          checkOutDate,
          check_in_date,
          check_out_date,
          checkIn,
          checkOut,
          check_in,
          check_out,
          hotelName,
          hotel_name,
          hotel_name_cn,
          roomName,
          roomType,
          price,
          totalPrice,
          total_amount,
          totalAmount
        } = mergedParams
        
        setHotelId(hotelId || '')
        setRoomId(roomId || '')
        const passedHotelName = hotelName || hotel_name_cn || hotel_name || ''
        const passedRoomName = roomName || roomType || ''
        if (passedHotelName || passedRoomName) {
          setBookingInfo(prev => ({
            ...prev,
            hotelName: passedHotelName || prev.hotelName,
            roomType: passedRoomName || prev.roomType
          }))
        }
        // 保存原始日期格式，用于提交给后端
        let originalCheckInDate = ''
        let originalCheckOutDate = ''
        
        // 优先使用从酒店详情页传递的价格
        const passedPrice = parseFloat(price) || 0
        const passedTotal = parseFloat(totalPrice || total_amount || totalAmount) || 0
        console.log('从酒店详情页传递的价格:', passedPrice)
        
        // 如果有价格参数，直接设置价格
        if (passedPrice > 0 || passedTotal > 0) {
          setBookingInfo(prev => ({
            ...prev,
            price: {
              original: passedPrice,
              discount: 0,
              coupon: 0,
              final: passedTotal > 0 ? passedTotal : passedPrice,
              total: passedTotal,
              points: Math.floor((passedTotal > 0 ? passedTotal : passedPrice) * 0.5)
            }
          }))
        } else if (hotelId) {
          // 如果没有价格参数但有酒店ID，获取酒店详情
          const hotelDetail = await hotelApi.getHotelDetail(hotelId)
          if (hotelDetail.code === 0 && hotelDetail.data) {
            const hotelData = hotelDetail.data
            
            // 根据roomId查找对应的房型
            let selectedRoomType = null
            if (roomId && hotelData.room_types && hotelData.room_types.length > 0) {
              selectedRoomType = hotelData.room_types.find(room => room.id === roomId)
            }
            
            // 如果没有找到对应的房型，使用第一个房型
            if (!selectedRoomType && hotelData.room_types && hotelData.room_types.length > 0) {
              selectedRoomType = hotelData.room_types[0]
            }
            
            // 获取房型价格
            const roomPrice = selectedRoomType?.prices?.[0]?.price || selectedRoomType?.price || 0
            
            setBookingInfo(prev => ({
              ...prev,
              hotelName: hotelData.hotel_name_cn || '',
              roomType: selectedRoomType?.room_type_name || selectedRoomType?.name || '',
              bedInfo: selectedRoomType?.bed_type || '',
              price: {
                original: roomPrice,
                discount: 0,
                coupon: 0,
                final: roomPrice,
                points: Math.floor(roomPrice * 0.5)
              }
            }))
          }
        }
        
        // 设置日期
        const paramCheckIn = checkInDate || check_in_date || checkIn || check_in
        const paramCheckOut = checkOutDate || check_out_date || checkOut || check_out
        if (paramCheckIn && paramCheckOut) {
          // 保存原始日期格式
          originalCheckInDate = paramCheckIn
          originalCheckOutDate = paramCheckOut
          
          // 验证日期是否有效
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const start = new Date(paramCheckIn)
          const end = new Date(paramCheckOut)
          
          // 如果入住日期早于今天，使用今天作为默认入住日期
          if (start < today) {
            // 格式化为标准日期格式
            originalCheckInDate = today.toISOString().split('T')[0]
            originalCheckOutDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
          
          const nights = Math.ceil((new Date(originalCheckOutDate) - new Date(originalCheckInDate)) / (1000 * 60 * 60 * 24))
          
          // 格式化日期显示
          const formatDate = (dateString) => {
            const date = new Date(dateString)
            const month = date.getMonth() + 1
            const day = date.getDate()
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(today.getDate() + 1)
            
            if (date.toDateString() === today.toDateString()) {
              return `${month}月${day}日 今天`
            } else if (date.toDateString() === tomorrow.toDateString()) {
              return `${month}月${day}日 明天`
            } else {
              return `${month}月${day}日`
            }
          }
          
          setBookingInfo(prev => ({
            ...prev,
            checkInDate: formatDate(originalCheckInDate),
            checkOutDate: formatDate(originalCheckOutDate),
            nights: `${nights}晚`,
            originalCheckInDate: originalCheckInDate,
            originalCheckOutDate: originalCheckOutDate
          }))
        } else {
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + 1)
          
          originalCheckInDate = today.toISOString().split('T')[0]
          originalCheckOutDate = tomorrow.toISOString().split('T')[0]
          
          const formatDate = (date) => {
            const month = date.getMonth() + 1
            const day = date.getDate()
            return `${month}月${day}日`
          }
          
          setBookingInfo(prev => ({
            ...prev,
            checkInDate: `${formatDate(today)} 今天`,
            checkOutDate: `${formatDate(tomorrow)} 明天`,
            nights: '1晚',
            originalCheckInDate: originalCheckInDate,
            originalCheckOutDate: originalCheckOutDate
          }))
        }
      } catch (error) {
        console.error('获取数据失败:', error)
        Taro.showToast({ title: '获取数据失败', icon: 'none', duration: 2000 })
      } finally {
        setFetchingData(false)
      }
    }
    
    fetchData()
  }, [])

  useEffect(() => {
    if (!bookingInfo.originalCheckInDate || !bookingInfo.originalCheckOutDate) return
    const checkIn = new Date(bookingInfo.originalCheckInDate)
    const checkOut = new Date(bookingInfo.originalCheckOutDate)
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    const validNights = Number.isFinite(nights) && nights > 0 ? nights : 1
    const nightlyPrice = Number(bookingInfo.price.original) || 0
    const paramTotal = Number(bookingInfo.price.total) || 0
    const total = paramTotal > 0 ? paramTotal : nightlyPrice * validNights
    setBookingInfo(prev => ({
      ...prev,
      nights: `${validNights}晚`,
      price: {
        ...prev.price,
        final: total,
        total,
        points: Math.floor(total * 0.5)
      }
    }))
  }, [bookingInfo.originalCheckInDate, bookingInfo.originalCheckOutDate, bookingInfo.price.original])

  // 获取优惠券数据
  const fetchCoupons = async () => {
    try {
      // 调用后端API获取优惠券列表
      const response = await couponApi.getCoupons({ type: 'all' })
      
      // 添加默认优惠券数据作为兜底
      const defaultCoupons = [
        {
          id: '1',
          name: '新用户专享优惠券',
          value: '50',
          min_spend: '300',
          expire_date: '2026-12-31',
          status: 'available',
          description: '新用户专享，满300减50'
        },
        {
          id: '2',
          name: '周末特惠优惠券',
          value: '30',
          min_spend: '200',
          expire_date: '2026-12-31',
          status: 'available',
          description: '周末入住，满200减30'
        }
      ]
      
      // 检查响应状态，即使token无效也使用默认优惠券数据
      if (response.code === 0 && response.data) {
        let couponsList = Array.isArray(response.data.coupons) ? response.data.coupons : []
        
        // 如果没有优惠券数据，尝试从本地存储中获取
        if (couponsList.length === 0) {
          console.log('从本地存储中获取优惠券数据')
          const userCoupons = Taro.getStorageSync('userCoupons') || []
          couponsList = userCoupons
        }
        
        // 如果还是没有优惠券数据，使用默认优惠券数据
        if (couponsList.length === 0) {
          console.log('使用默认优惠券数据')
          couponsList = defaultCoupons
        }
        
        // 筛选出满足当前订单金额的优惠券
        const eligibleCoupons = couponsList.filter(coupon => {
          const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0
          const currentTotal = bookingInfo.price.final || bookingInfo.price.original || 0
          // 如果currentTotal是0，那么就不筛选，直接返回所有优惠券
          return currentTotal === 0 || currentTotal >= minSpend
        })
        console.log('筛选后的优惠券:', eligibleCoupons)
        setCoupons(eligibleCoupons)
      } else {
        // 使用默认优惠券数据
        let couponsList = defaultCoupons
        
        // 尝试从本地存储中获取优惠券数据
        console.log('从本地存储中获取优惠券数据')
        const userCoupons = Taro.getStorageSync('userCoupons') || []
        if (userCoupons.length > 0) {
          couponsList = userCoupons
        }
        
        const eligibleCoupons = couponsList.filter(coupon => {
          const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0
          const currentTotal = bookingInfo.price.final || bookingInfo.price.original || 0
          // 如果currentTotal是0，那么就不筛选，直接返回所有优惠券
          return currentTotal === 0 || currentTotal >= minSpend
        })
        console.log('筛选后的优惠券:', eligibleCoupons)
        setCoupons(eligibleCoupons)
      }
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      
      // 使用默认优惠券数据
      let couponsList = [
        {
          id: '1',
          name: '新用户专享优惠券',
          value: '50',
          min_spend: '300',
          expire_date: '2026-12-31',
          status: 'available',
          description: '新用户专享，满300减50'
        },
        {
          id: '2',
          name: '周末特惠优惠券',
          value: '30',
          min_spend: '200',
          expire_date: '2026-12-31',
          status: 'available',
          description: '周末入住，满200减30'
        }
      ]
      
      // 尝试从本地存储中获取优惠券数据
      console.log('从本地存储中获取优惠券数据')
      const userCoupons = Taro.getStorageSync('userCoupons') || []
      if (userCoupons.length > 0) {
        couponsList = userCoupons
      }
      
      const eligibleCoupons = couponsList.filter(coupon => {
        const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0
        const currentTotal = bookingInfo.price.final || bookingInfo.price.original || 0
        // 如果currentTotal是0，那么就不筛选，直接返回所有优惠券
        return currentTotal === 0 || currentTotal >= minSpend
      })
      console.log('筛选后的优惠券:', eligibleCoupons)
      setCoupons(eligibleCoupons)
    }
  }

  // 计算优惠后的价格
  const calculateFinalPrice = (coupon) => {
    const originalPrice = bookingInfo.price.final || bookingInfo.price.original || 0
    
    if (coupon) {
      // 计算优惠后的价格
      const discountValue = parseFloat(coupon.value || coupon.discount_value || 0)
      const minSpend = parseFloat(coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0)
      
      // 检查是否满足使用条件
      if (originalPrice >= minSpend) {
        const discountedPrice = originalPrice - discountValue
        setBookingInfo(prev => ({
          ...prev,
          price: {
            ...prev.price,
            coupon: discountValue,
            final: Math.max(0, discountedPrice)
          }
        }))
      } else {
        // 不满足使用条件，显示提示信息
        Taro.showToast({ 
          title: `订单金额未达到优惠券使用条件（满${minSpend}元）`, 
          icon: 'none' 
        })
      }
    } else {
      // 不使用优惠券
      setBookingInfo(prev => ({
        ...prev,
        price: {
          ...prev.price,
          coupon: 0,
          final: originalPrice
        }
      }))
    }
  }

  // 处理优惠券选择
  const handleCouponSelect = (coupon) => {
    console.log('选择优惠券:', coupon)
    setSelectedCoupon(coupon)
    calculateFinalPrice(coupon)
    setShowCouponModal(false)
  }

  // 处理优惠券弹窗显示
  const handleCouponClick = () => {
    console.log('点击优惠券区域，可用优惠券数量:', coupons.length)
    if (coupons.length === 0) {
      Taro.showToast({ title: '暂无可用优惠券', icon: 'none' })
    } else {
      setShowCouponModal(true)
    }
  }

  // 初始化时获取优惠券数据
  useEffect(() => {
    // 页面加载时立即获取优惠券数据，不需要等待订单金额计算完成
    fetchCoupons()
  }, [])
  
  // 订单金额变化时重新获取优惠券数据，确保筛选出满足条件的优惠券
  useEffect(() => {
    if (bookingInfo.price.final > 0) {
      fetchCoupons()
    }
  }, [bookingInfo.price.final])

  const validateGuestInfo = () => {
    if (!guestInfo.name || guestInfo.name.trim() === '') {
      Taro.showToast({ title: '请输入住客姓名', icon: 'none', duration: 2000 })
      return false
    }
    if (!guestInfo.phone || guestInfo.phone.replace(/\s+/g, '').length !== 11) {
      Taro.showToast({ title: '请输入正确的手机号码', icon: 'none', duration: 2000 })
      return false
    }
    return true
  }

  const handleSubmitBooking = async () => {
    const isValid = validateGuestInfo()
    if (!isValid) return

    try {
      setLoading(true)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const checkInDate = new Date(bookingInfo.originalCheckInDate)
      checkInDate.setHours(0, 0, 0, 0)
      const checkOutDate = new Date(bookingInfo.originalCheckOutDate)
      checkOutDate.setHours(0, 0, 0, 0)
      
      if (checkInDate < today) {
        Taro.showToast({ title: '入住日期不能早于今天', icon: 'none', duration: 2000 })
        setLoading(false)
        return
      }
      
      if (checkInDate >= checkOutDate) {
        Taro.showToast({ title: '入住日期必须早于退房日期', icon: 'none', duration: 2000 })
        setLoading(false)
        return
      }
      
      const bookingData = {
        hotel_id: hotelId,
        room_type_id: roomId,
        check_in_date: bookingInfo.originalCheckInDate,
        check_out_date: bookingInfo.originalCheckOutDate,
        contact_name: guestInfo.name,
        contact_phone: guestInfo.phone,
        special_requests: specialRequests.filter(item => item.selected).map(item => item.name).join(',')
      }
      
      const response = await bookingApi.createBooking(bookingData)
      
      if (response.code === 0 && response.data) {
        const bookingId = response.data.booking_id || response.data.id || 'BK_' + Date.now()
        
        Taro.setStorageSync('paymentPayload', {
          bookingId,
          totalAmount: bookingInfo.price.final,
          originalAmount: bookingInfo.price.original || bookingInfo.price.final,
          hotelName: bookingInfo.hotelName,
          checkInDate: bookingInfo.checkInDate,
          checkOutDate: bookingInfo.checkOutDate,
          roomType: bookingInfo.roomType,
          selectedCoupon: selectedCoupon
        })
        Taro.navigateTo({
          url: `/pages/payment/index?bookingId=${bookingId}`,
          fail: (err) => {
            console.error('跳转失败：', err)
            Taro.showToast({ title: '跳转支付页失败', icon: 'none', duration: 2000 })
          }
        })
      } else {
        console.error('创建预订失败：', response.msg || '未知错误')
        Taro.showToast({ title: response.msg || '创建预订失败', icon: 'none', duration: 2000 })
      }
    } catch (error) {
      console.error('提交订单异常：', error)
      Taro.showToast({ title: '提交订单失败', icon: 'none', duration: 2000 })
    } finally {
      setLoading(false)
    }
  }

  const handleSpecialRequestToggle = (id) => {
    setSpecialRequests(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    )
  }

  return (
    <View className='booking-confirm-page'>
      <View className='back-btn' style={{ cursor: 'pointer' }} onClick={() => Taro.navigateBack()}>
        <Text className='back-icon'>←</Text>
        <Text className='back-text'>返回</Text>
      </View>
      
      <ScrollView className='content-scroll' scrollY>
        {fetchingData ? (
          <View className='loading-container'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        ) : (
          <View className='summary-section'>
            <View className='section-title'>
              <Text>订单信息</Text>
            </View>
            <View className='summary-row'>
              <Text className='label'>酒店名称</Text>
              <Text className='value'>{bookingInfo.hotelName || '酒店名称'}</Text>
            </View>
            <View className='summary-row'>
              <Text className='label'>房型名称</Text>
              <Text className='value'>{bookingInfo.roomType || '房型'}</Text>
            </View>
            <View className='summary-row'>
              <Text className='label'>入住/离店</Text>
              <Text className='value'>{bookingInfo.checkInDate || '入住日期'} - {bookingInfo.checkOutDate || '离店日期'}</Text>
            </View>
            <View className='summary-row'>
              <Text className='label'>总间夜数</Text>
              <Text className='value'>{bookingInfo.nights}</Text>
            </View>
            <View className='summary-row'>
              <Text className='label'>总价</Text>
              <Text className='value'>¥{bookingInfo.price.final || bookingInfo.price.original}</Text>
            </View>
            <View className='summary-row final'>
              <Text className='label'>应付金额</Text>
              <Text className='final-value'>¥{bookingInfo.price.final || bookingInfo.price.original}</Text>
            </View>
          </View>
        )}

        <View className='booking-info-section'>
          <View className='section-title'>
            <Text>入住信息</Text>
          </View>
          <View className='form-item'>
            <Text className='label'>住客姓名*</Text>
            <Input
              value={guestInfo.name}
              placeholder='请输入住客姓名'
              onInput={(e) => setGuestInfo({ ...guestInfo, name: e.detail.value })}
            />
          </View>

          <View className='form-item'>
            <Text className='label'>联系手机*</Text>
            <View className='phone-input'>
              <Text>+86</Text>
              <Input
                value={guestInfo.phone}
                placeholder='请输入手机号码'
                onInput={(e) => setGuestInfo({ ...guestInfo, phone: e.detail.value })}
              />
            </View>
          </View>
        </View>

        <View className='special-requests-section'>
          <View className='section-title'>
            <Text>特殊要求</Text>
          </View>
          <View className='request-tags'>
            {specialRequests.map(item => (
              <View
                key={item.id}
                className={`request-tag ${item.selected ? 'selected' : ''}`}
                onClick={() => handleSpecialRequestToggle(item.id)}
              >
                <Text>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className='bottom-bar'>
        <View className='price-info'>
          <Text>应付总价</Text>
          <Text className='final-price'>¥{bookingInfo.price.final}</Text>
        </View>
        <Button
          className='pay-btn'
          onClick={handleSubmitBooking}
          loading={loading}
          disabled={loading}
          hoverClass='pay-btn-hover'
        >
          确认
        </Button>
      </View>
    </View>
  )
}

export default BookingConfirm
