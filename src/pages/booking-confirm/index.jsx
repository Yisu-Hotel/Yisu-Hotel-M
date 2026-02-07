/*import Taro, { useState, useEffect } from '@tarojs/taro';
import { View, Text, ScrollView, Button, Input, Picker } from '@tarojs/components';
import './index.less';

// 模拟数据，与详情页保持一致
const mockData = {
  hotelInfo: {
    name: '回坊轩礼精品酒店(西安回民街钟楼地铁站店)',
  },
  dateRange: '2月7日 今天 - 2月8日 明天',
  stayNight: '1晚',
  roomInfo: {
    name: '舒雅大床房',
    bed: '1张1.8米大床',
    breakfast: '无早餐',
    freeCancel: '02月07日23:00前免费取消',
    confirmNow: '立即确认',
    remaining: '仅剩1间',
    price: 141,
    originalPrice: 369,
    discount: 228,
    promotionDiscount: 218,
    couponDiscount: 10,
    points: 71
  },
  defaultGuest: {
    name: '杨一菲',
    phone: '185 9589 0987'
  }
};

export default function BookingConfirm() {
  const [bookingToken, setBookingToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [guestName, setGuestName] = useState(mockData.defaultGuest.name);
  const [guestPhone, setGuestPhone] = useState(mockData.defaultGuest.phone);
  const [roomCount, setRoomCount] = useState(1);

  // 从路由参数获取预订信息
  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params) {
      setBookingToken(params.bookingToken || '');
      setRoomId(params.roomId || '');
    }
  }, []);

  // 减少房间数
  const handleMinusRoom = () => {
    if (roomCount > 1) {
      setRoomCount(roomCount - 1);
    }
  };

  // 增加房间数
  const handlePlusRoom = () => {
    setRoomCount(roomCount + 1);
  };

  // 提交订单，跳转到支付页
  const handleSubmitOrder = () => {
    // 这里可以调用API提交订单，然后跳转到支付页
    Taro.navigateTo({
      url: `/pages/payment/index?bookingToken=${bookingToken}`
    });
  };

  return (
    <ScrollView className="booking-confirm-page" scrollY>
      {//顶部酒店和房型信息 
    }
      <View className="header-info">
        <Text className="hotel-name">{mockData.hotelInfo.name}</Text>
        <View className="date-row">
          <Text className="date">{mockData.dateRange}</Text>
          <Text className="night">{mockData.stayNight}</Text>
          <Text className="room-detail-link">房型详情</Text>
        </View>
        <View className="room-info-row">
          <Text className="room-name">{mockData.roomInfo.name}</Text>
          <Text className="room-bed">{mockData.roomInfo.bed}</Text>
          <Text className="room-breakfast">{mockData.roomInfo.breakfast}</Text>
        </View>
        <View className="cancel-confirm-row">
          <View className="cancel-item">
            <Text className="check-icon">✓</Text>
            <Text className="cancel-text">{mockData.roomInfo.freeCancel}</Text>
          </View>
          <View className="confirm-item">
            <Text className="check-icon">✓</Text>
            <Text className="confirm-text">{mockData.roomInfo.confirmNow}</Text>
          </View>
        </View>
      </View>

      {// 加载提示条 
      }
      <View className="loading-bar">
        <Text className="loading-icon">👍</Text>
        <Text className="loading-text">精选好房正在路上</Text>
      </View>

      {//订房信息 
    }
      <View className="booking-info-section">
        <View className="section-title">订房信息</View>
        <View className="room-count-row">
          <Text className="remaining">{mockData.roomInfo.remaining}</Text>
          <View className="room-count-control">
            <Text className="control-btn" onClick={handleMinusRoom}>-</Text>
            <Text className="room-count">{roomCount}间</Text>
            <Text className="control-btn" onClick={handlePlusRoom}>+</Text>
          </View>
        </View>

        <View className="guest-info-row">
          <Text className="label">住客姓名*</Text>
          <Input
            className="input"
            value={guestName}
            onInput={(e) => setGuestName(e.detail.value)}
            placeholder="请输入住客姓名"
          />
          <View className="add-guest-icon">👤+</View>
        </View>

        <View className="guest-info-row">
          <Text className="label">联系手机*</Text>
          <View className="phone-input-wrap">
            <Text className="country-code">+86</Text>
            <Input
              className="phone-input"
              value={guestPhone}
              onInput={(e) => setGuestPhone(e.detail.value)}
              placeholder="请输入手机号码"
            />
            <View className="scan-icon">📞</View>
          </View>
          <View className="phone-tip">请注意是否用此号码接收订单信息</View>
        </View>
      </View>

      {// 本单可享优惠 
    }
      <View className="discount-section">
        <View className="section-title">本单可享</View>
        <View className="total-discount">
          <Text>已享最大优惠 ¥{mockData.roomInfo.discount}</Text>
        </View>
        <View className="discount-item">
          <Text className="discount-name">促销优惠</Text>
          <Text className="discount-value">3项优惠 共减¥{mockData.roomInfo.promotionDiscount} ∨</Text>
        </View>
        <View className="discount-item">
          <Text className="discount-name">优惠券</Text>
          <Text className="discount-value">满减券 减¥{mockData.roomInfo.couponDiscount} &gt;</Text>
        </View>
        <View className="discount-item">
          <Text className="discount-name">离店赚积分</Text>
          <Text className="discount-value">{mockData.roomInfo.points}积分 &gt;</Text>
        </View>
      </View>

      {// 特殊要求 
    }
      <View className="special-request-section">
        <View className="section-title">特殊要求</View>
        <View className="request-tags">
          <Text className="tag">吸烟偏好</Text>
          <Text className="tag">电梯远近</Text>
          <Text className="more-request">更多入住要求 &gt;</Text>
        </View>
      </View>

      {// 发票 
    }
      <View className="invoice-section">
        <View className="section-title">发票</View>
        <Text className="invoice-info">酒店开具发票</Text>
        <View className="invoice-help">?</View>
      </View>

      {// 底部支付栏 
    }
      <View className="bottom-bar">
        <View className="price-info">
          <Text className="pay-type">在线付</Text>
          <Text className="price">¥{mockData.roomInfo.price}</Text>
          <Text className="detail-link">查看明细 ∧</Text>
          <Text className="new-user-tag">新人价</Text>
        </View>
        <Button className="pay-btn" onClick={handleSubmitOrder}>立即支付</Button>
      </View>
    </ScrollView>
  );
}*/
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';

export default function BookingConfirm() {
  return (
    <View>
      <Text>预订确认页</Text>
    </View>
  );
}