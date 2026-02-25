import { useState, useEffect } from 'react'
import { View, Text, Image, Button, Radio, RadioGroup, ScrollView } from '@tarojs/components'
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
  
  // 优惠券预览状态
  const [showCouponPreview, setShowCouponPreview] = useState(false)
  const [previewCoupon, setPreviewCoupon] = useState(null)
  
  // Payment methods state (keeping the UI structure)
  const [paymentMethods] = useState([
    {
      id: 'wechat',
      name: '微信支付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20pay%20logo%20icon&image_size=square'
    },
    {
      id: 'alipay',
      name: '支付宝支付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=alipay%20logo%20icon&image_size=square'
    },
    {
      id: 'unionpay',
      name: '云闪付',
      icon: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=unionpay%20logo%20icon&image_size=square'
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
          // 从本地存储获取前端传递的价格信息
          const storageParams = Taro.getStorageSync('paymentPayload') || {}

          // 创建一个包含前端传递价格信息的订单详情对象
          const enhancedBookingDetail = {
            ...detailRes.data,
            // 优先使用前端传递的价格信息
            total_price: storageParams.totalAmount || detailRes.data.total_price || detailRes.data.price_detail?.total_price || 0,
            price_detail: {
              ...(detailRes.data.price_detail || {}),
              total_price: storageParams.totalAmount || detailRes.data.price_detail?.total_price || detailRes.data.total_price || 0
            }
          }

          setBookingDetail(enhancedBookingDetail)
          
          // 检查是否有传递过来的优惠券数据
          if (storageParams.selectedCoupon) {
            setSelectedCoupon(storageParams.selectedCoupon)
            // 计算优惠后的价格
            calculateFinalPrice(storageParams.selectedCoupon)
          } else {
            // 如果没有优惠券，设置最终价格为前端传递的总金额
            setFinalPrice(storageParams.totalAmount || enhancedBookingDetail.total_price || enhancedBookingDetail.price_detail?.total_price || 0)
          }
          
          // 无论订单状态如何，都获取优惠券数据
          fetchCoupons()
        } else {
          // 即使后端API调用失败，也尝试使用前端传递的价格信息
          const storageParams = Taro.getStorageSync('paymentPayload') || {}
          if (storageParams.totalAmount) {
            const enhancedBookingDetail = {
              total_price: storageParams.totalAmount,
              price_detail: {
                total_price: storageParams.totalAmount
              }
            }
            setBookingDetail(enhancedBookingDetail)
            setFinalPrice(storageParams.totalAmount)
          }
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
      // 调用后端API获取优惠券列表，只获取可用的优惠券
      const response = await couponApi.getCoupons({ type: 'available' })
      
      // 检查响应状态
      if (response.code === 0 && response.data) {
        let couponsList = Array.isArray(response.data.coupons) ? response.data.coupons : []
        
        // 筛选出可用的优惠券（status=available 或 status=unused）
        const eligibleCoupons = couponsList.filter(coupon => {
          return coupon.status === 'available' || coupon.status === 'unused'
        })
        console.log('筛选后的优惠券:', eligibleCoupons)
        setCoupons(eligibleCoupons)
      } else {
        console.log('获取优惠券列表失败或无数据')
        setCoupons([])
      }
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      setCoupons([])
    }
  }

  // 推荐优惠券
  const getRecommendedCoupon = () => {
    if (!bookingDetail || coupons.length === 0) return null
    
    const originalPrice = parseFloat(bookingDetail.price_detail?.total_price || bookingDetail.total_price || 0)
    
    // 筛选出满足使用条件的优惠券
    const eligibleCoupons = coupons.filter(coupon => {
      const minSpend = parseFloat(coupon.min_spend || coupon.min_order_amount || coupon.minSpend || 0)
      return minSpend <= originalPrice
    })
    
    if (eligibleCoupons.length === 0) return null
    
    // 按优惠金额从大到小排序
    eligibleCoupons.sort((a, b) => {
      const valueA = parseFloat(a.value || a.discount_value || 0)
      const valueB = parseFloat(b.value || b.discount_value || 0)
      return valueB - valueA
    })
    
    // 返回优惠金额最大的优惠券
    return eligibleCoupons[0]
  }

  // 检查是否是推荐的优惠券
  const isRecommendedCoupon = (coupon) => {
    const recommended = getRecommendedCoupon()
    if (!recommended || !coupon) return false
    return recommended.id === coupon.id || recommended.coupon_id === coupon.id || recommended.id === coupon.coupon_id
  }

  // 显示优惠券预览
  const handleCouponPreview = (coupon) => {
    setPreviewCoupon(coupon)
    setShowCouponPreview(true)
  }

  // 关闭优惠券预览
  const closeCouponPreview = () => {
    setShowCouponPreview(false)
    setPreviewCoupon(null)
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
    
    // 校验是否选择了支付方式
    if (!selectedMethod) {
      Taro.showToast({ title: '请选择一种支付方式', icon: 'none' })
      return
    }
    
    try {
      setLoading(true)
      
      // 先调用优惠券使用API
      if (selectedCoupon) {
        try {
          await couponApi.useCoupon(selectedCoupon.id || selectedCoupon.coupon_id, bookingDetail.id)
          console.log('优惠券使用成功')
        } catch (error) {
          console.error('使用优惠券失败:', error)
          // 优惠券使用失败，提示用户并终止支付流程
          Taro.showToast({ title: error.response?.msg || '使用优惠券失败', icon: 'none' })
          setLoading(false)
          return
        }
      }
      
      // 然后执行支付
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
        // 支付成功后，通知优惠券页面刷新优惠券列表
        Taro.eventCenter.trigger('refreshCoupons')
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else if (res && res.code === 400 && (res.msg.includes('已使用') || res.msg.includes('重复使用'))) {
        // 处理优惠券已使用的错误
        Taro.showToast({ title: '该优惠券已使用，不可重复使用', icon: 'none' })
      } else {
        Taro.showToast({ title: res?.msg || '支付失败', icon: 'none' })
      }
    } catch (error) {
      console.error('Pay error:', error)
      // 检查错误响应是否包含优惠券已使用的信息
      if (error.response && error.response.code === 400 && (error.response.msg.includes('已使用') || error.response.msg.includes('重复使用'))) {
        Taro.showToast({ title: '该优惠券已使用，不可重复使用', icon: 'none' })
      } else {
        Taro.showToast({ title: '支付请求失败', icon: 'none' })
      }
    } finally {
      setLoading(false)
    }
  }

  // 处理优惠券选择
  const handleCouponSelect = (coupon) => {
    console.log('选择优惠券:', coupon)
    
    // 检查优惠券状态
    if (coupon.status === 'used') {
      Taro.showToast({ 
        title: '该优惠券已使用，不可重复使用', 
        icon: 'none' 
      })
      return
    }
    
    if (coupon.status === 'expired') {
      Taro.showToast({ 
        title: '该优惠券已过期，不可使用', 
        icon: 'none' 
      })
      return
    }
    
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
      case 'pending':
      case 'pending_payment':
      case 'pending_pay':
        return '#ff9900'
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
        <View className='back-btn' style={{ cursor: 'pointer' }} onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
          <Text className='back-text'>返回</Text>
        </View>
        <Text>未找到订单信息</Text>
      </View>
    )
  }

  return (
    <View className='payment-page'>
      <View className='back-btn' style={{ cursor: 'pointer' }} onClick={() => Taro.navigateBack()}>
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

        {(bookingDetail.status === 'pending' || bookingDetail.status === 'pending_payment' || bookingDetail.status === 'pending_pay' || bookingDetail.status_text === '待支付') && (
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
                            {coupons.length > 0 ? (
                                coupons.map(coupon => {
                                    const couponName = coupon.name || coupon.title
                                    const discountValue = coupon.value || coupon.discount_value
                                    const minSpend = coupon.min_spend || coupon.min_order_amount || coupon.minSpend
                                    const expireDate = coupon.expire_date || coupon.valid_until
                                    
                                    // 检查是否满足使用条件
                                    const originalPrice = bookingDetail?.price_detail?.total_price || bookingDetail?.total_price || 0
                                    const isEligible = originalPrice >= minSpend
                                    const isDisabled = coupon.status === 'used' || coupon.status === 'expired'
                                    
                                    const isRecommended = isRecommendedCoupon(coupon)
                                
                                return (
                                    <View 
                                        key={coupon.id || coupon.coupon_id}
                                        className={`coupon-item ${isDisabled ? 'coupon-disabled' : ''} ${isEligible && !isDisabled ? 'eligible' : !isDisabled ? 'not-eligible' : ''} ${selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                                        onClick={() => {
                                            // 显示优惠券预览
                                            handleCouponPreview(coupon)
                                        }}
                                    >
                                        {isRecommended && (
                                            <View className='coupon-recommended-tag'>
                                                <Text className='recommended-text'>推荐</Text>
                                            </View>
                                        )}
                                        <View className='coupon-left'>
                                            <Text className={`coupon-value ${isDisabled ? 'coupon-value-disabled' : ''}`}>¥{discountValue}</Text>
                                            <Text className={`coupon-condition ${isDisabled ? 'coupon-text-disabled' : ''}`}>满{minSpend}元可用</Text>
                                        </View>
                                        <View className='coupon-right'>
                                            <Text className={`coupon-name ${isDisabled ? 'coupon-text-disabled' : ''}`}>{couponName}</Text>
                                            <Text className={`coupon-expire ${isDisabled ? 'coupon-text-disabled' : ''}`}>有效期至: {new Date(expireDate).toLocaleDateString()}</Text>
                                            {!isEligible && !isDisabled && (
                                                <Text className='coupon-notice'>订单金额不足</Text>
                                            )}
                                            {isDisabled && coupon.status === 'used' && (
                                                <Text className='coupon-notice'>已使用</Text>
                                            )}
                                            {isDisabled && coupon.status === 'expired' && (
                                                <Text className='coupon-notice'>已过期</Text>
                                            )}
                                        </View>
                                        <View className={`coupon-check ${selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) ? 'checked' : ''}`}>
                                            {selectedCoupon && (selectedCoupon.id === coupon.id || selectedCoupon.coupon_id === coupon.id || selectedCoupon.id === coupon.coupon_id) && <Text className='check-icon'>✓</Text>}
                                        </View>
                                    </View>
                                )
                                })
                            ) : (
                                <View className='empty-coupons'>
                                    <Text>暂无可用优惠券</Text>
                                </View>
                            )}
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

            {/* 优惠券预览弹窗 */}
            {showCouponPreview && previewCoupon && (
                <View className='coupon-preview-overlay'>
                    <View className='coupon-preview-content'>
                        <View className='coupon-preview-header'>
                            <Text className='preview-title'>优惠券详情</Text>
                            <View className='preview-close' onClick={closeCouponPreview}>
                                <Text className='close-icon'>×</Text>
                            </View>
                        </View>
                        <View className='coupon-preview-body'>
                            <View className='coupon-preview-card'>
                                <View className='preview-card-header'>
                                    <Text className='preview-card-title'>{previewCoupon.name || previewCoupon.title}</Text>
                                    {isRecommendedCoupon(previewCoupon) && (
                                        <View className='preview-recommended-tag'>
                                            <Text className='recommended-text'>推荐</Text>
                                        </View>
                                    )}
                                </View>
                                <View className='preview-card-content'>
                                    <View className='preview-price-section'>
                                        <Text className='preview-price'>¥{previewCoupon.value || previewCoupon.discount_value}</Text>
                                        <Text className='preview-condition'>满{previewCoupon.min_spend || previewCoupon.min_order_amount || previewCoupon.minSpend || 0}元可用</Text>
                                    </View>
                                    <View className='preview-info-section'>
                                        <View className='preview-info-row'>
                                            <Text className='preview-info-label'>有效期</Text>
                                            <Text className='preview-info-value'>{new Date(previewCoupon.expire_date || previewCoupon.valid_until).toLocaleDateString()}</Text>
                                        </View>
                                        <View className='preview-info-row'>
                                            <Text className='preview-info-label'>状态</Text>
                                            <Text className={`preview-info-value ${previewCoupon.status === 'used' ? 'status-used' : previewCoupon.status === 'expired' ? 'status-expired' : 'status-available'}`}>
                                                {previewCoupon.status === 'used' ? '已使用' : previewCoupon.status === 'expired' ? '已过期' : '可用'}
                                            </Text>
                                        </View>
                                        <View className='preview-info-row'>
                                            <Text className='preview-info-label'>适用范围</Text>
                                            <Text className='preview-info-value'>{previewCoupon.applicable_scope || previewCoupon.scope || '所有酒店'}</Text>
                                        </View>
                                        {previewCoupon.description && (
                                            <View className='preview-info-row'>
                                                <Text className='preview-info-label'>描述</Text>
                                                <Text className='preview-info-value'>{previewCoupon.description}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View className='coupon-preview-footer'>
                            {!previewCoupon.status || previewCoupon.status === 'available' || previewCoupon.status === 'unused' ? (
                                <View className='preview-button select' onClick={() => {
                                    const originalPrice = bookingDetail?.price_detail?.total_price || bookingDetail?.total_price || 0
                                    const minSpend = parseFloat(previewCoupon.min_spend || previewCoupon.min_order_amount || previewCoupon.minSpend || 0)
                                    if (originalPrice >= minSpend) {
                                        handleCouponSelect(previewCoupon)
                                        closeCouponPreview()
                                    } else {
                                        Taro.showToast({ 
                                            title: '订单金额不足，无法使用该优惠券', 
                                            icon: 'none' 
                                        })
                                    }
                                }}>
                                    <Text>选择使用</Text>
                                </View>
                            ) : null}
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
                        <View className={`method-check ${selectedMethod === method.id ? 'checked' : ''}`}>
                            {selectedMethod === method.id && <Text className='check-icon'>✓</Text>}
                        </View>
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
