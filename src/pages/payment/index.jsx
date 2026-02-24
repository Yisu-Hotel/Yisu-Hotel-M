import { useState, useEffect } from 'react'
import { View, Text, Image, Button, Radio, ScrollView } from '@tarojs/components'
import { AtIcon, AtToast, AtActivityIndicator, AtModal } from 'taro-ui'
import Taro from '@tarojs/taro'
import { bookingApi, couponApi } from '../../services/api'
import './index.less'

const PaymentPage = () => {
  const [bookingDetail, setBookingDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState([])
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [finalPrice, setFinalPrice] = useState(0)
  
  // Payment methods state (keeping the UI structure)
  const [paymentMethods] = useState([
    {
      id: 'wechat',
      name: '微信支付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20pay%20logo%20icon&image_size=square',
      checked: true
    },
    {
      id: 'alipay',
      name: '支付宝支付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=alipay%20logo%20icon&image_size=square',
      checked: false
    },
    {
      id: 'unionpay',
      name: '云闪付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=unionpay%20logo%20icon&image_size=square',
      checked: false
    }
  ])
  const [selectedMethod, setSelectedMethod] = useState('wechat')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const params = Taro.getCurrentInstance().router?.params || {}
        // Fallback to storage if not in params (for backward compatibility or reload)
        const storageParams = Taro.getStorageSync('paymentPayload') || {}
        const bookingId = params.bookingId || storageParams.bookingId

        if (!bookingId) {
          Taro.showToast({ title: '参数错误: 缺少订单ID', icon: 'none' })
          setLoading(false)
          return
        }

        // Fetch Booking Detail
        console.log('Fetching booking detail for:', bookingId)
        
        const detailRes = await bookingApi.getBookingDetail(bookingId)

        console.log('Booking detail response:', detailRes)

        if (detailRes && detailRes.code === 0 && detailRes.data) {
          setBookingDetail(detailRes.data)
          
          // 检查是否有传递过来的优惠券数据
          if (storageParams.selectedCoupon) {
            setSelectedCoupon(storageParams.selectedCoupon)
            // 计算优惠后的价格
            calculateFinalPrice(storageParams.selectedCoupon)
          }
          
          // If pending, fetch coupons
          if (detailRes.data.status === 'pending') {
            fetchCoupons()
          }
        } else {
          Taro.showToast({ title: detailRes?.msg || '获取订单详情失败', icon: 'none' })
        }
      } catch (error) {
        console.error('Fetch error:', error)
        Taro.showToast({ title: '网络请求失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchCoupons = async () => {
    try {
      const res = await couponApi.getCoupons({ type: 'available' })
      // 检查响应状态，即使token无效也使用默认优惠券数据
      if (res && res.code === 0) {
        const couponList = res.data?.coupons || []
        // 筛选出满足当前订单金额的优惠券
        if (bookingDetail) {
          const originalPrice = bookingDetail.price_detail?.total_price || bookingDetail.total_price || 0
          const eligibleCoupons = couponList.filter(coupon => {
            const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minOrderAmount || 0
            return originalPrice >= minSpend
          })
          setCoupons(eligibleCoupons)
        } else {
          setCoupons(couponList)
        }
        // 计算最终价格
        calculateFinalPrice(null)
      } else {
        // 使用默认优惠券数据
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
        // 筛选出满足当前订单金额的优惠券
        if (bookingDetail) {
          const originalPrice = bookingDetail.price_detail?.total_price || bookingDetail.total_price || 0
          const eligibleCoupons = defaultCoupons.filter(coupon => {
            const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minOrderAmount || 0
            return originalPrice >= minSpend
          })
          setCoupons(eligibleCoupons)
        } else {
          setCoupons(defaultCoupons)
        }
        // 计算最终价格
        calculateFinalPrice(null)
      }
    } catch (error) {
      console.error('Fetch coupons error:', error)
      // 使用默认优惠券数据
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
      // 筛选出满足当前订单金额的优惠券
      if (bookingDetail) {
        const originalPrice = bookingDetail.price_detail?.total_price || bookingDetail.total_price || 0
        const eligibleCoupons = defaultCoupons.filter(coupon => {
          const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minOrderAmount || 0
          return originalPrice >= minSpend
        })
        setCoupons(eligibleCoupons)
      } else {
        setCoupons(defaultCoupons)
      }
      // 计算最终价格
      calculateFinalPrice(null)
    }
  }

  // 计算最终价格
  const calculateFinalPrice = (coupon) => {
    if (!bookingDetail) return
    
    const originalPrice = parseFloat(bookingDetail.price_detail?.total_price || bookingDetail.total_price || 0)
    
    if (coupon) {
      // 计算优惠后的价格
      const discountValue = parseFloat(coupon.value || coupon.discount_value || 0)
      const minSpend = parseFloat(coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0)
      
      // 检查是否满足使用条件
      if (originalPrice >= minSpend) {
        const discountedPrice = originalPrice - discountValue
        setFinalPrice(Math.max(0, discountedPrice))
      } else {
        setFinalPrice(originalPrice)
        // 显示提示信息
        Taro.showToast({ 
          title: `订单金额未达到优惠券使用条件（满${minSpend}元）`, 
          icon: 'none' 
        })
      }
    } else {
      setFinalPrice(originalPrice)
    }
  }

  const handlePay = async () => {
    if (!bookingDetail) return
    
    try {
      setLoading(true)
      const paymentData = {
        booking_id: bookingDetail.id,
        order_id: bookingDetail.id,
        payment_method: selectedMethod,
        transaction_id: `TXN_${Date.now()}`, // Simulation
        coupon_id: selectedCoupon?.id || selectedCoupon?.coupon_id // 添加优惠券ID
      }
      
      const res = await bookingApi.payBooking(paymentData)
      
      if (res && res.code === 0) {
        Taro.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({ title: res?.msg || '支付失败', icon: 'none' })
      }
    } catch (error) {
      console.error('Pay error:', error)
      Taro.showToast({ title: '支付请求失败', icon: 'none' })
    } finally {
      setLoading(false)
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#ff9900'
      case 'paid': return '#07c160'
      case 'cancelled': return '#999999'
      case 'completed': return '#10aeff'
      default: return '#333'
    }
  }

  if (loading && !bookingDetail) {
    return (
      <View className='payment-page loading'>
        <AtActivityIndicator mode='center' content='加载中...' />
      </View>
    )
  }

  if (!bookingDetail) {
    return (
      <View className='payment-page empty'>
        <View className='back-button' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
          <Text className='back-text'>返回</Text>
        </View>
        <Text>未找到订单信息</Text>
      </View>
    )
  }

  return (
    <View className='payment-page'>
      {/* 返回按钮 */}
      <View className='back-button' onClick={() => Taro.navigateBack()}>
        <Text className='back-icon'>←</Text>
        <Text className='back-text'>返回</Text>
      </View>

      <ScrollView scrollY className='content-scroll'>
        {/* 订单详情卡片 */}
        <View className='booking-detail-card'>
            <View className='card-header'>
                <Text className='hotel-name'>{bookingDetail.hotel_name}</Text>
                <Text className='status-text' style={{color: getStatusColor(bookingDetail.status)}}>
                    {bookingDetail.status_text}
                </Text>
            </View>
            
            <View className='detail-row'>
                <Text className='label'>订单号</Text>
                <Text className='value'>{bookingDetail.order_number}</Text>
            </View>
            <View className='detail-row'>
                <Text className='label'>地址</Text>
                <Text className='value'>{bookingDetail.hotel_address}</Text>
            </View>
            <View className='detail-row'>
                <Text className='label'>房型</Text>
                <Text className='value'>{bookingDetail.room_type}</Text>
            </View>
            <View className='detail-row'>
                <Text className='label'>入离日期</Text>
                <Text className='value'>{bookingDetail.check_in_date} 至 {bookingDetail.check_out_date}</Text>
            </View>
            <View className='detail-row'>
                <Text className='label'>入住人</Text>
                <Text className='value'>{bookingDetail.contact_name} {bookingDetail.contact_phone}</Text>
            </View>
             <View className='detail-row'>
                <Text className='label'>特殊要求</Text>
                <Text className='value'>{bookingDetail.special_requests || '无'}</Text>
            </View>
             <View className='detail-row'>
                <Text className='label'>下单时间</Text>
                <Text className='value'>{new Date(bookingDetail.booked_at).toLocaleString()}</Text>
            </View>
            
            <View className='divider' />
            
            <View className='price-row'>
                <Text className='label'>订单总价</Text>
                <Text className='price'>¥{bookingDetail.price_detail?.total_price || bookingDetail.total_price}</Text>
            </View>
            {selectedCoupon && (
                <View className='price-row discount'>
                    <Text className='label'>优惠券折扣</Text>
                    <Text className='discount-price'>-¥{selectedCoupon.value || selectedCoupon.discount_value}</Text>
                </View>
            )}
            {selectedCoupon && (
                <View className='price-row final'>
                    <Text className='label'>实付金额</Text>
                    <Text className='final-price'>¥{finalPrice}</Text>
                </View>
            )}
        </View>

        {/* 支付栏 (仅当状态为 pending 时显示) */}
        {bookingDetail.status === 'pending' && (
            <View className='payment-section'>
                {/* 优惠券栏 */}
                <View className='coupon-section'>
                    <View className='section-title'>优惠券</View>
                    <View className='coupon-selector' onClick={handleCouponClick}>
                        <Text>{selectedCoupon ? `已选择: ${selectedCoupon.name || selectedCoupon.title}` : coupons.length > 0 ? `${coupons.length}张可用` : '暂无可用优惠券'}</Text>
                        <AtIcon value='chevron-right' size='16' color='#999' />
                    </View>
                </View>

                {/* 优惠券选择弹窗 */}
                {showCouponModal && (
                    <View className='coupon-modal-overlay'>
                        <View className='coupon-modal-content'>
                            <View className='coupon-modal-header'>
                                <Text className='modal-title'>选择优惠券</Text>
                                <View className='modal-close' onClick={() => setShowCouponModal(false)}>
                                    <Text className='close-icon'>×</Text>
                                </View>
                            </View>
                            <ScrollView className='coupon-modal-body' style={{ maxHeight: '400px' }}>
                                {/* 不使用优惠券选项 */}
                                <View 
                                    className={`coupon-item ${!selectedCoupon ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedCoupon(null)
                                        calculateFinalPrice(null)
                                        setShowCouponModal(false)
                                    }}
                                >
                                    <View className='coupon-content'>
                                        <Text className='coupon-name'>不使用优惠券</Text>
                                    </View>
                                    <View className={`coupon-check ${!selectedCoupon ? 'checked' : ''}`}>
                                        {!selectedCoupon && <Text className='check-icon'>✓</Text>}
                                    </View>
                                </View>
                                
                                {/* 优惠券列表 */}
                                {coupons.map(coupon => {
                                    const couponName = coupon.name || coupon.title
                                    const discountValue = coupon.value || coupon.discount_value
                                    const minSpend = coupon.min_spend || coupon.min_order_amount
                                    const expireDate = coupon.expire_date || coupon.valid_until
                                    
                                    // 检查是否满足使用条件
                                    const originalPrice = bookingDetail.price_detail?.total_price || bookingDetail.total_price
                                    const isEligible = originalPrice >= minSpend
                                    
                                    return (
                                        <View 
                                            key={coupon.id || coupon.coupon_id}
                                            className={`coupon-item ${isEligible ? 'eligible' : 'not-eligible'} ${selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) ? 'selected' : ''}`}
                                            onClick={() => isEligible && handleCouponSelect(coupon)}
                                        >
                                            <View className='coupon-left'>
                                                <Text className='coupon-value'>¥{discountValue}</Text>
                                                <Text className='coupon-condition'>满{minSpend}元可用</Text>
                                            </View>
                                            <View className='coupon-right'>
                                                <Text className='coupon-name'>{couponName}</Text>
                                                <Text className='coupon-expire'>有效期至: {new Date(expireDate).toLocaleDateString()}</Text>
                                                {!isEligible && (
                                                    <Text className='coupon-notice'>订单金额不足</Text>
                                                )}
                                            </View>
                                            <View className={`coupon-check ${selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) ? 'checked' : ''}`}>
                                                {selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) && <Text className='check-icon'>✓</Text>}
                                            </View>
                                        </View>
                                    )
                                })}
                            </ScrollView>
                            <View className='coupon-modal-footer'>
                                <View className='modal-button cancel' onClick={() => setShowCouponModal(false)}>
                                    <Text>取消</Text>
                                </View>
                                <View className='modal-button confirm' onClick={() => {
                                    setSelectedCoupon(null)
                                    calculateFinalPrice(null)
                                    setShowCouponModal(false)
                                }}>
                                    <Text>不使用优惠券</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* 支付方式栏 */}
                <View className='payment-methods'>
                    <View className='section-title'>支付方式</View>
                    {paymentMethods.map(method => (
                        <View 
                            key={method.id} 
                            className='payment-method-item'
                            onClick={() => setSelectedMethod(method.id)}
                        >
                            <View className='left'>
                                <Image src={method.icon} className='method-icon' />
                                <Text>{method.name}</Text>
                            </View>
                            <Radio checked={selectedMethod === method.id} color='#007aff' />
                        </View>
                    ))}
                </View>
                
                <Button 
                    className='pay-button' 
                    onClick={handlePay}
                    loading={loading}
                >
                    立即支付 ¥{finalPrice}
                </Button>
            </View>
        )}
      </ScrollView>
    </View>
  )
}

export default PaymentPage
