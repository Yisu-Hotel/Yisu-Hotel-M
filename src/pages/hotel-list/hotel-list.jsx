import { View, Text, Image, ScrollView, Button, Switch, Input } from '@tarojs/components'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, showToast, navigateTo, redirectTo, showModal, startPullDownRefresh, stopPullDownRefresh } from '@tarojs/taro'
import { hotelApi } from '../../services/api'
import DateSelector from '../../components/DateSelector'
import './hotel-list.less'

// 酒店卡片组件
const HotelCard = React.memo(({ hotel, onHotelClick, onCollect, onLongPress, isCollected }) => {
  return (
    <View 
      key={hotel.id} 
      className='hotel-card' 
      onClick={() => onHotelClick(hotel.id)}
      onLongPress={(e) => onLongPress(hotel.id, e)}
    >
      <View className='hotel-image-container'>
        <View className='hotel-image-wrapper'>
          <Image 
            src={hotel.image && !hotel.image.includes('example.com') ? hotel.image : 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hotel%20room%20interior%20default%20placeholder&image_size=landscape_4_3'} 
            className='hotel-image'
            mode="aspectFill"
            lazyLoad={true}
            placeholder='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hotel%20room%20interior%20loading%20placeholder&image_size=landscape_4_3'
            onError={(e) => {
              e.target.src = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hotel%20room%20interior%20default%20placeholder&image_size=landscape_4_3'
            }}
          />
          <View className='image-loading-overlay' style={{ display: hotel.image ? 'none' : 'flex' }}>
            <Text>加载中...</Text>
          </View>
        </View>
        <View className='hotel-tags'>
          {hotel.available && <View className='tag available'>可订</View>}
          {hotel.freeCancellation && <View className='tag free-cancel'>免费取消</View>}
        </View>
        <View 
          className={`collect-button ${isCollected ? 'collected' : ''}`}
          onClick={(e) => onCollect(hotel.id, e)}
        >
          <Text style={{ fontSize: '20px' }}>{isCollected ? '⭐' : '☆'}</Text>
        </View>
      </View>
      
      <View className='hotel-info'>
        <View className='hotel-header'>
          <Text className='hotel-name'>{hotel.name}</Text>
          <View className='hotel-rating'>
            <Text className='rating-value'>{hotel.rating}</Text>
            <Text className='rating-label'>分</Text>
          </View>
        </View>
        
        <View className='hotel-stats'>
          <Text className='hotel-collection'>收藏 {hotel.collectionCount || 0}</Text>
          <Text className='hotel-distance'>距离 {hotel.distance}</Text>
        </View>
        
        <Text className='hotel-address'>{hotel.address}</Text>
        
        <View className='hotel-amenities'>
          {hotel.amenities && hotel.amenities.slice(0, 3).map((amenity, index) => {
            // 确保amenity是字符串
            const amenityText = typeof amenity === 'object' ? (amenity.name || amenity.label || JSON.stringify(amenity)) : amenity;
            return (
              <View key={index} className='amenity-tag'>
                <Text className='amenity-text'>{amenityText}</Text>
              </View>
            );
          })}
        </View>
        
        <View className='hotel-bottom'>
          <View className='hotel-price'>
            <Text className='price-symbol'>¥</Text>
            <Text className='price-value'>{hotel.price}</Text>
            <Text className='price-unit'>/晚</Text>
          </View>
          <Button className='book-button'>预订</Button>
        </View>
      </View>
    </View>
  )
})

// 加载状态组件
const LoadingComponent = React.memo(() => {
  return (
    <View className='loading-container'>
      <Text className='loading-text'>加载中...</Text>
    </View>
  )
})

// 空状态组件
const EmptyComponent = React.memo(({ onResetFilter }) => {
  return (
    <View className='empty-container'>
      <Text className='empty-text'>暂无匹配酒店</Text>
      <Button className='reset-button' onClick={onResetFilter}>
        重置筛选
      </Button>
      <Button className='back-button' onClick={() => navigateTo({ url: '/pages/index/index' })}>
        返回首页
      </Button>
    </View>
  )
})

// 加载更多组件
const LoadingMoreComponent = React.memo(() => {
  return (
    <View className='loading-more'>
      <Text>加载中...</Text>
    </View>
  )
})

// 到底部组件
const NoMoreComponent = React.memo(() => {
  return (
    <View className='no-more'>
      <Text>已到底部</Text>
    </View>
  )
})

export default function HotelList () {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hotels, setHotels] = useState([])
  const [searchParams, setSearchParams] = useState({})
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showDateSelector, setShowDateSelector] = useState(false)
  const [sortType, setSortType] = useState('default') // default, price_asc, price_desc, distance
  const [filters, setFilters] = useState({
    priceRange: [0, 5000],
    starLevels: [],
    amenities: [],
    minRating: 0,
    // 新增筛选维度
    hotelTypes: [],
    brands: [],
    roomFacilities: [],
    hotelFeatures: []
  })
  const [tempFilters, setTempFilters] = useState({
    priceRange: [0, 5000],
    starLevels: [],
    amenities: [],
    minRating: 0,
    // 新增筛选维度
    hotelTypes: [],
    brands: [],
    roomFacilities: [],
    hotelFeatures: []
  })
  const [collectedHotels, setCollectedHotels] = useState(new Set())
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleHotels, setVisibleHotels] = useState([])
  const [containerHeight, setContainerHeight] = useState(500)
  const scrollViewRef = useRef(null)
  const itemHeight = 380 // 每个酒店卡片的高度（包括margin）
  const bufferSize = 3 // 可见区域上下各缓存3个项目

  // 初始化收藏状态
  const initCollectedHotels = useCallback(async () => {
    try {
      // 检查用户是否已登录
      const token = Taro.getStorageSync('token')
      if (!token) {
        // 用户未登录，使用空集合
        setCollectedHotels(new Set())
        return
      }
      
      const response = await hotelApi.getCollectedHotels()
      if (response.code === 0 && response.data) {
        // 处理response.data可能不是数组的情况
        const hotelsArray = Array.isArray(response.data) ? response.data : (response.data.favorites || response.data.list || [])
        const collectedIds = hotelsArray.map(hotel => {
          // 处理不同的数据结构
          if (hotel.hotel) {
            return hotel.hotel.id || hotel.hotel.hotel_id
          }
          return hotel.id || hotel.hotel_id
        })
        setCollectedHotels(new Set(collectedIds))
      }
    } catch (error) {
      console.error('获取收藏列表失败', error)
      // 检查是否是认证错误
      if (error.message.includes('401') || error.message.includes('Token')) {
        // 登录已过期，清除本地token并使用空集合
        Taro.removeStorageSync('token')
        Taro.removeStorageSync('isLoggedIn')
      }
      // 出错时不影响页面加载，使用空集合
      setCollectedHotels(new Set())
    }
  }, [])

  // 初始化页面
  useEffect(() => {
    initPage()
  }, [router.query])

  // 监听页面显示，处理从城市选择页面返回的情况
  useEffect(() => {
    // 在React中，我们可以直接依赖router.query的变化来触发initPage
    // 因为当从城市选择页面返回时，router.query会包含新的城市参数
    // 而initPage函数已经在useEffect中依赖了router.query
    // 所以不需要额外的事件监听器
  }, [])

  // 初始化收藏列表
  useEffect(() => {
    initCollectedHotels()
  }, [])

  // 处理滚动事件，实现虚拟滚动
  const handleScroll = useCallback((e) => {
    const scrollTop = e.detail.scrollTop
    setScrollTop(scrollTop)
    
    // 计算可见区域的起始和结束索引
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
    const endIndex = Math.min(
      hotels.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
    )
    
    // 只渲染可见区域内的酒店卡片
    setVisibleHotels(hotels.slice(startIndex, endIndex))
  }, [hotels, containerHeight])

  // 初始化容器高度
  useEffect(() => {
    const updateContainerHeight = () => {
      if (scrollViewRef.current) {
        const rect = scrollViewRef.current.getBoundingClientRect()
        setContainerHeight(rect.height)
      }
    }
    
    // 初始计算
    updateContainerHeight()
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateContainerHeight)
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', updateContainerHeight)
    }
  }, [])

  // 当酒店数据变化时，重新计算可见酒店
  useEffect(() => {
    if (hotels.length > 0) {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
      const endIndex = Math.min(
        hotels.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
      )
      setVisibleHotels(hotels.slice(startIndex, endIndex))
    } else {
      setVisibleHotels([])
    }
  }, [hotels, scrollTop, containerHeight])

  // 当showFilter为true时，同步tempFilters为当前filters的值
  useEffect(() => {
    if (showFilter) {
      setTempFilters({ ...filters })
    }
  }, [showFilter, filters])

  // 搜索酒店
  const searchHotels = useCallback(async (params) => {
    try {
      setLoading(true)
      
      // 构建完整的搜索参数
      const searchParams = {
        // 基础参数
        city: params.city || '北京',
        keyword: params.keyword || '',
        checkInDate: params.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: params.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        sort: params.sort || sortType,
        // 筛选条件
        starLevels: params.starLevels || filters.starLevels || [],
        priceRange: params.priceRange || filters.priceRange || [0, 5000],
        amenities: params.amenities || filters.amenities || [],
        minRating: params.minRating || filters.minRating || 0,
        // 新增筛选维度
        hotelTypes: params.hotelTypes || filters.hotelTypes || [],
        brands: params.brands || filters.brands || [],
        roomFacilities: params.roomFacilities || filters.roomFacilities || [],
        hotelFeatures: params.hotelFeatures || filters.hotelFeatures || [],
        // 其他参数
        selectedTags: params.selectedTags || [],
        selectedFacilities: params.selectedFacilities || [],
        selectedFilterValue: params.selectedFilterValue || '',
        currentFilterType: params.currentFilterType || ''
      }
      
      // 确保城市参数格式正确
      if (searchParams.city) {
        searchParams.cityName = searchParams.cityName || searchParams.city
        searchParams.location = searchParams.location || searchParams.city
      }
      
      console.log('搜索参数:', searchParams)
      
      // 调用后端API搜索酒店
      const searchResult = await hotelApi.getHotelList(searchParams)
      
      if (searchResult.code === 0 && searchResult.data) {
        // 处理后端返回的数据结构，将 data.list 转换为前端期望的格式
        const rawHotels = searchResult.data.list || searchResult.data.hotels || []
        
        // 转换酒店数据格式，确保字段名称与前端匹配
        const newHotels = rawHotels.map(hotel => ({
          id: hotel.hotel_id || hotel.id,
          name: hotel.hotel_name_cn || hotel.name,
          rating: hotel.rating || hotel.score,
          address: hotel.nearby_info || hotel.address || hotel.location,
          price: hotel.min_price || hotel.price || hotel.rate,
          image: hotel.hotel_image || hotel.image || hotel.main_image_url?.[0] || hotel.images?.[0],
          starLevel: hotel.star_rating || hotel.starLevel,
          amenities: hotel.facilities || hotel.amenities || [],
          tags: hotel.tags || []
        }))
        
        if (params.page === 1) {
          setHotels(newHotels)
        } else {
          setHotels(prev => [...prev, ...newHotels])
        }
        
        setTotalCount(searchResult.data.total || searchResult.data.count || newHotels.length)
        // 修正hasMore判断逻辑：是否还有更多数据 = 当前加载的数量 < 总数量
        setHasMore((params.page * (params.pageSize || 10)) < (searchResult.data.total || searchResult.data.count || newHotels.length))
        setPage(params.page)
      } else {
        showToast({
          title: searchResult.message || searchResult.msg || '搜索失败，请稍后重试',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('搜索酒店失败', error)
      showToast({
        title: error.message || '搜索失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
      if (refreshing) {
        stopPullDownRefresh()
      }
    }
  }, [sortType, filters, refreshing])

  // 初始化页面数据
  const initPage = useCallback(async () => {
    try {
      // 检查是否从首页传递了查询参数
      const paramsFromHome = router.query && router.query.params
      let searchParamsData = {}
      
      if (paramsFromHome) {
        try {
          // 解析从首页传递的参数
          searchParamsData = JSON.parse(decodeURIComponent(paramsFromHome))
          console.log('从首页获取的查询参数:', searchParamsData)
        } catch (error) {
          console.error('解析参数失败:', error)
          searchParamsData = {}
        }
      }
      
      // 检查是否从城市选择页面返回
      const cityFromParams = router.query && router.query.city
      console.log('从路由参数获取的城市:', cityFromParams)
      
      // 使用传递的参数或默认参数初始化
      const defaultParams = {
        city: cityFromParams || searchParamsData.city || '北京',
        keyword: searchParamsData.keyword || '',
        checkInDate: searchParamsData.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: searchParamsData.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        nights: searchParamsData.nights || 1,
        selectedTags: searchParamsData.selectedTags || [],
        selectedFilterValue: searchParamsData.selectedFilterValue || '',
        selectedFacilities: searchParamsData.selectedFacilities || [],
        currentFilterType: searchParamsData.currentFilterType || '',
        pageSize: 10
      }
      
      console.log('使用参数初始化:', defaultParams)
      
      setSearchParams(defaultParams)
      
      // 重置分页
      setPage(1)
      setHotels([])
      setHasMore(true)
      
      // 初始化筛选条件
      const newFilters = {
        priceRange: [0, 5000],
        starLevels: [],
        amenities: [],
        minRating: 0
      }
      
      // 处理从首页传递的设施筛选
      if (searchParamsData.selectedFacilities && searchParamsData.selectedFacilities.length > 0) {
        newFilters.amenities = searchParamsData.selectedFacilities
      }
      
      // 处理从首页传递的星级筛选
      if (searchParamsData.selectedFilterValue && searchParamsData.currentFilterType === 'star') {
        const starLevel = parseInt(searchParamsData.selectedFilterValue)
        if (!isNaN(starLevel)) {
          newFilters.starLevels = [starLevel]
        }
      }
      
      // 处理从首页传递的价格筛选
      if (searchParamsData.selectedFilterValue && searchParamsData.currentFilterType === 'price') {
        // 根据价格区间字符串解析价格范围
        const priceValue = searchParamsData.selectedFilterValue
        if (priceValue === '0-500') {
          newFilters.priceRange = [0, 500]
        } else if (priceValue === '500-1000') {
          newFilters.priceRange = [500, 1000]
        } else if (priceValue === '1000-1500') {
          newFilters.priceRange = [1000, 1500]
        } else if (priceValue === '1500-2000') {
          newFilters.priceRange = [1500, 2000]
        } else if (priceValue === '2000+') {
          newFilters.priceRange = [2000, 5000]
        }
      }
      
      setFilters(newFilters)
      setTempFilters(newFilters)
      
      // 搜索酒店
      console.log('开始搜索酒店...')
      await searchHotels({ ...defaultParams, page: 1 })
      
    } catch (error) {
      console.error('初始化页面失败', error)
      showToast({
        title: '加载失败，请稍后重试',
        icon: 'none'
      })
    }
  }, [searchHotels, router.query])

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // 手动触发下拉刷新动画（兼容部分端）
    startPullDownRefresh()
    setPage(1)
    setHotels([])
    setHasMore(true)
    await searchHotels({ ...searchParams, page: 1 })
  }, [searchParams, searchHotels])

  // 加载更多
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return
    
    setLoadingMore(true)
    await searchHotels({ ...searchParams, page: page + 1 })
  }, [hasMore, loadingMore, loading, page, searchParams, searchHotels])

  // 查看酒店详情 - 修复：修改跳转路径为正确的详情页路径
  const handleHotelClick = useCallback((hotelId) => {
    navigateTo({
      url: `/pages/hotel-detail/index?id=${hotelId}&returnUrl=/pages/hotel-list/hotel-list`
    })
  }, [])

  // 切换收藏状态
  const handleCollect = useCallback(async (hotelId, e) => {
    e.stopPropagation()
    
    try {
      // 检查用户是否已登录
      const token = Taro.getStorageSync('token')
      if (!token) {
        // 用户未登录，提示登录
        showToast({
          title: '请先登录',
          icon: 'none'
        })
        // 跳转到登录页
        Taro.navigateTo({
          url: '/pages/login/login'
        })
        return
      }
      
      const isCurrentlyCollected = collectedHotels.has(hotelId)
      
      if (isCurrentlyCollected) {
        // 取消收藏
        await hotelApi.uncollectHotel(hotelId)
        setCollectedHotels(prev => {
          const newCollected = new Set(prev)
          newCollected.delete(hotelId)
          return newCollected
        })
        showToast({
          title: '取消收藏成功',
          icon: 'success'
        })
      } else {
        // 收藏
        await hotelApi.collectHotel(hotelId)
        setCollectedHotels(prev => {
          const newCollected = new Set(prev)
          newCollected.add(hotelId)
          return newCollected
        })
        showToast({
          title: '收藏成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('操作收藏失败', error)
      // 检查是否是认证错误
      if (error.message.includes('401') || error.message.includes('Token')) {
        showToast({
          title: '登录已过期，请重新登录',
          icon: 'none'
        })
        // 跳转到登录页
        Taro.navigateTo({
          url: '/pages/login/login'
        })
      } else if (error.message.includes('400') && error.message.includes('已经收藏过')) {
        // 处理已收藏的情况，更新本地状态
        setCollectedHotels(prev => {
          const newCollected = new Set(prev)
          newCollected.add(hotelId)
          return newCollected
        })
        showToast({
          title: '该酒店已收藏',
          icon: 'none'
        })
      } else {
        showToast({
          title: '操作失败，请稍后重试',
          icon: 'none'
        })
      }
    }
  }, [collectedHotels])

  // 处理排序
  const handleSort = useCallback((type) => {
    setSortType(type)
    setShowSort(false)
    setPage(1)
    setHotels([])
    setHasMore(true)
    // 直接传递type参数给searchHotels函数，确保使用最新的排序类型
    searchHotels({ ...searchParams, page: 1, sort: type })
  }, [searchParams, searchHotels])

  // 处理筛选
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setHotels([])
    setHasMore(true)
    searchHotels({ ...searchParams, page: 1 })
  }, [searchParams, searchHotels])

  // 重置筛选
  const handleResetFilter = useCallback(() => {
    const resetFilters = {
      priceRange: [0, 5000],
      starLevels: [],
      amenities: [],
      minRating: 0,
      // 新增筛选维度
      hotelTypes: [],
      brands: [],
      roomFacilities: [],
      hotelFeatures: []
    }
    setFilters(resetFilters)
    setTempFilters(resetFilters)
    setPage(1)
    setHotels([])
    setHasMore(true)
    searchHotels({ ...searchParams, page: 1 })
  }, [searchParams, searchHotels])

  // 处理长按
  const handleLongPress = useCallback((hotelId, e) => {
    e.stopPropagation()
    
    showModal({
      title: '操作',
      content: '选择操作',
      confirmText: '不感兴趣',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          setHotels(prev => prev.filter(hotel => hotel.id !== hotelId))
          showToast({
            title: '已隐藏该酒店',
            icon: 'success'
          })
        }
      }
    })
  }, [])

  // 处理城市选择
  const handleCitySelect = useCallback(() => {
    console.log('点击了城市选择按钮')
    // 构建完整的返回URL，包含当前的搜索参数
    const returnUrl = `/pages/hotel-list/hotel-list?params=${encodeURIComponent(JSON.stringify(searchParams))}`
    // 使用navigateTo跳转到城市选择页面，保留当前页面在栈中
    navigateTo({
      url: `/pages/city-select/city-select?returnUrl=${encodeURIComponent(returnUrl)}`
    })
  }, [searchParams])

  // 处理日期选择
  const handleDateSelect = useCallback(() => {
    setShowDateSelector(true)
  }, [])

  // 处理日期选择确认
  const handleDateConfirm = useCallback((checkInDate, checkOutDate, nights) => {
    const newParams = {
      ...searchParams,
      checkInDate,
      checkOutDate,
      nights
    }
    
    setSearchParams(newParams)
    setShowDateSelector(false)
    setPage(1)
    setHotels([])
    setHasMore(true)
    searchHotels({ ...newParams, page: 1 })
  }, [searchParams, searchHotels])

  // 处理日期选择取消
  const handleDateCancel = useCallback(() => {
    setShowDateSelector(false)
  }, [])

  // 获取星期几
  const getWeekday = useCallback((dateStr) => {
    const date = new Date(dateStr)
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }, [])

  // 获取星级筛选显示文本
  const getStarFilterText = useCallback(() => {
    if (!filters.starLevels || filters.starLevels.length === 0) {
      return '不限'
    }
    const starMap = {
      2: '二星',
      3: '三星',
      4: '四星',
      5: '五星'
    }
    return filters.starLevels.map(level => starMap[level] || level).join(', ')
  }, [filters.starLevels])

  // 获取价格筛选显示文本
  const getPriceFilterText = useCallback(() => {
    const [min, max] = filters.priceRange
    if (min === 0 && max === 5000) {
      return '不限'
    }
    return `${min}元-${max}元`
  }, [filters.priceRange])

  // 获取设施筛选显示文本
  const getFacilityFilterText = useCallback(() => {
    if (!filters.amenities || filters.amenities.length === 0) {
      return '不限'
    }
    if (filters.amenities.length > 2) {
      return `${filters.amenities.slice(0, 2).join(', ')}等`
    }
    return filters.amenities.join(', ')
  }, [filters.amenities])

  // 处理查询按钮点击
  const handleSearch = useCallback(() => {
    setPage(1)
    setHotels([])
    setHasMore(true)
    // 构建完整的搜索参数，包含所有筛选条件
    const searchParamsWithFilters = {
      ...searchParams,
      starLevels: filters.starLevels,
      priceRange: filters.priceRange,
      amenities: filters.amenities,
      minRating: filters.minRating,
      page: 1,
      // 确保包含所有必要的参数
      city: searchParams.city || '北京',
      keyword: searchParams.keyword || '',
      checkInDate: searchParams.checkInDate || new Date().toISOString().split('T')[0],
      checkOutDate: searchParams.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      selectedTags: searchParams.selectedTags || [],
      selectedFacilities: searchParams.selectedFacilities || []
    }
    console.log('传递给searchHotels的参数:', searchParamsWithFilters)
    searchHotels(searchParamsWithFilters)
  }, [searchParams, filters, searchHotels])

  // 渲染酒店卡片
  const renderHotelCard = useCallback((hotel) => {
    const isCollected = collectedHotels.has(hotel.id)
    
    return (
      <HotelCard 
        hotel={hotel}
        onHotelClick={handleHotelClick}
        onCollect={handleCollect}
        onLongPress={handleLongPress}
        isCollected={isCollected}
      />
    )
  }, [handleHotelClick, handleCollect, handleLongPress, collectedHotels])

  // 处理筛选确认
  const handleFilterConfirm = useCallback(() => {
    setFilters({ ...tempFilters })
    setShowFilter(false)
    setPage(1)
    setHotels([])
    setHasMore(true)
    searchHotels({ ...searchParams, page: 1 })
  }, [tempFilters, searchParams, searchHotels])

  // 处理筛选取消
  const handleFilterCancel = useCallback(() => {
    setShowFilter(false)
  }, [])

  // 渲染筛选区域
  const renderFilterSection = useCallback(() => {
    return (
      <View className='filter-section'>
        <View className='filter-header'>
          <Text className='filter-title'>筛选条件</Text>
          <Text className='filter-reset' onClick={handleResetFilter}>重置</Text>
        </View>
        
        {/* 价格区间 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>价格区间</Text>
          <View className='price-range'>
            <Text className='price-value'>{tempFilters.priceRange[0]}元</Text>
            <Text className='price-separator'>-</Text>
            <Text className='price-value'>{tempFilters.priceRange[1]}元</Text>
          </View>
          {/* 价格滑块 */}
          <View className='price-slider'>
            {/* 这里可以集成价格滑块组件 */}
          </View>
        </View>
        
        {/* 酒店星级 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>酒店星级</Text>
          <View className='star-options'>
            {['二星及以下', '三星', '四星', '五星'].map((star, index) => (
              <View 
                key={index} 
                className={`star-option ${tempFilters.starLevels.includes(index + 2) ? 'selected' : ''}`}
                onClick={() => {
                  const newStarLevels = [...tempFilters.starLevels]
                  const targetLevel = index + 2
                  if (newStarLevels.includes(targetLevel)) {
                    newStarLevels.splice(newStarLevels.indexOf(targetLevel), 1)
                  } else {
                    newStarLevels.push(targetLevel)
                  }
                  setTempFilters({ ...tempFilters, starLevels: newStarLevels })
                }}
              >
                <Text>{star}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* 设施服务 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>设施服务</Text>
          <View className='amenity-options'>
            {['免费WiFi', '游泳池', '24小时前台', '停车场', '健身房', '餐厅'].map((amenity, index) => (
              <View 
                key={index} 
                className={`amenity-option ${tempFilters.amenities.includes(amenity) ? 'selected' : ''}`}
                onClick={() => {
                  const newAmenities = [...tempFilters.amenities]
                  if (newAmenities.includes(amenity)) {
                    newAmenities.splice(newAmenities.indexOf(amenity), 1)
                  } else {
                    newAmenities.push(amenity)
                  }
                  setTempFilters({ ...tempFilters, amenities: newAmenities })
                }}
              >
                <Text>{amenity}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 酒店类型 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>酒店类型</Text>
          <View className='amenity-options'>
            {['商务酒店', '度假酒店', '民宿', '公寓', '精品酒店', '连锁酒店'].map((type, index) => (
              <View 
                key={index} 
                className={`amenity-option ${tempFilters.hotelTypes.includes(type) ? 'selected' : ''}`}
                onClick={() => {
                  const newHotelTypes = [...tempFilters.hotelTypes]
                  if (newHotelTypes.includes(type)) {
                    newHotelTypes.splice(newHotelTypes.indexOf(type), 1)
                  } else {
                    newHotelTypes.push(type)
                  }
                  setTempFilters({ ...tempFilters, hotelTypes: newHotelTypes })
                }}
              >
                <Text>{type}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 酒店品牌 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>酒店品牌</Text>
          <View className='amenity-options'>
            {['万豪', '希尔顿', '洲际', '凯悦', '雅高', '华住', '首旅如家', '锦江'].map((brand, index) => (
              <View 
                key={index} 
                className={`amenity-option ${tempFilters.brands.includes(brand) ? 'selected' : ''}`}
                onClick={() => {
                  const newBrands = [...tempFilters.brands]
                  if (newBrands.includes(brand)) {
                    newBrands.splice(newBrands.indexOf(brand), 1)
                  } else {
                    newBrands.push(brand)
                  }
                  setTempFilters({ ...tempFilters, brands: newBrands })
                }}
              >
                <Text>{brand}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 房间设施 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>房间设施</Text>
          <View className='amenity-options'>
            {['空调', '冰箱', '保险箱', '迷你吧', '咖啡机', '阳台', '浴缸', '智能设备'].map((facility, index) => (
              <View 
                key={index} 
                className={`amenity-option ${tempFilters.roomFacilities.includes(facility) ? 'selected' : ''}`}
                onClick={() => {
                  const newRoomFacilities = [...tempFilters.roomFacilities]
                  if (newRoomFacilities.includes(facility)) {
                    newRoomFacilities.splice(newRoomFacilities.indexOf(facility), 1)
                  } else {
                    newRoomFacilities.push(facility)
                  }
                  setTempFilters({ ...tempFilters, roomFacilities: newRoomFacilities })
                }}
              >
                <Text>{facility}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 酒店特色 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>酒店特色</Text>
          <View className='amenity-options'>
            {['亲子友好', '宠物友好', '无烟房', '近地铁', '商务中心', '会议室', 'SPA', '酒吧'].map((feature, index) => (
              <View 
                key={index} 
                className={`amenity-option ${tempFilters.hotelFeatures.includes(feature) ? 'selected' : ''}`}
                onClick={() => {
                  const newHotelFeatures = [...tempFilters.hotelFeatures]
                  if (newHotelFeatures.includes(feature)) {
                    newHotelFeatures.splice(newHotelFeatures.indexOf(feature), 1)
                  } else {
                    newHotelFeatures.push(feature)
                  }
                  setTempFilters({ ...tempFilters, hotelFeatures: newHotelFeatures })
                }}
              >
                <Text>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* 用户评分 */}
        <View className='filter-item'>
          <Text className='filter-item-title'>用户评分</Text>
          <View className='rating-options'>
            {[0, 3, 4, 4.5].map((rating) => (
              <View 
                key={rating} 
                className={`rating-option ${tempFilters.minRating === rating ? 'selected' : ''}`}
                onClick={() => setTempFilters({ ...tempFilters, minRating: rating })}
              >
                <Text>{rating === 0 ? '不限' : `≥${rating}分`}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* 确定和取消按钮 */}
        <View className='filter-buttons'>
          <View className='cancel-button' onClick={handleFilterCancel}>
            <Text>取消</Text>
          </View>
          <View className='confirm-button' onClick={handleFilterConfirm}>
            <Text>确定</Text>
          </View>
        </View>
      </View>
    )
  }, [tempFilters, handleFilterConfirm, handleFilterCancel, handleResetFilter])

  // 渲染排序选项
  const renderSortOptions = useCallback(() => {
    const sortOptions = [
      { key: 'default', label: '综合排序' },
      { key: 'price_asc', label: '价格升序' },
      { key: 'price_desc', label: '价格降序' },
      { key: 'distance', label: '距离由近及远' },
      { key: 'rating_desc', label: '评分由高到低' },
      { key: 'favorites_desc', label: '收藏量由多到少' },
      { key: 'review_rate_desc', label: '好评率由高到低' }
    ]
    
    return (
      <View className='sort-options'>
        {sortOptions.map((option) => (
          <View 
            key={option.key} 
            className={`sort-option ${sortType === option.key ? 'selected' : ''}`}
            onClick={() => handleSort(option.key)}
          >
            <Text>{option.label}</Text>
          </View>
        ))}
      </View>
    )
  }, [sortType, handleSort])

  return (
    <View className='hotel-list'>
      {/* 顶部核心筛选头 */}
      <View className='filter-header-fixed'>
        <View className='filter-header-top'>
          {/* 返回按钮 */}
          <View className='back-button' onClick={() => Taro.navigateBack()}>
            <Text style={{ fontSize: '20px' }}>←</Text>
            <Text>返回</Text>
          </View>
          <Text className='page-title'>酒店列表</Text>
          <View style={{ width: 60 }} />
        </View>
        
        {/* 核心查询区域 */}
        <View className='search-container'>
          {/* 城市选择 */}
          <View className='location-bar' onClick={handleCitySelect}>
            <Text className='location-icon'>📍</Text>
            <Text className='location-text'>{searchParams.city || '请选择城市'}</Text>
            <Text className='location-icon'>▾</Text>
          </View>
          
          {/* 日期选择 */}
          <View className='date-container' onClick={handleDateSelect}>
            <View className='date-item'>
              <Text className='date-label'>入住日期</Text>
              <Text className='date-value'>{searchParams.checkInDate}</Text>
              <Text className='date-week'>{getWeekday(searchParams.checkInDate)}</Text>
            </View>
            <View className='date-separator'>
              <Text className='date-night'>{searchParams.nights || 0}晚</Text>
            </View>
            <View className='date-item'>
              <Text className='date-label'>离店日期</Text>
              <Text className='date-value'>{searchParams.checkOutDate}</Text>
              <Text className='date-week'>{getWeekday(searchParams.checkOutDate)}</Text>
            </View>
          </View>
        
        {/* 搜索输入框 */}
        <View className='search-input-container'>
          <Text className='search-icon'>🔍</Text>
          <Input 
            placeholder='输入酒店名称/品牌/位置' 
            value={searchParams.keyword || ''} 
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.detail.value }))}
            className='search-input'
            onSubmit={(e) => {
              setPage(1)
              setHotels([])
              setHasMore(true)
              searchHotels({ ...searchParams, keyword: e.detail.value, page: 1 })
            }}
          />
        </View>
        
        {/* 筛选条件栏 */}
          <View className='filter-bar'>
            <View className='filter-item' onClick={() => setShowFilter(!showFilter)}>
              <Text>星级</Text>
              <Text className='filter-value'>{getStarFilterText()}</Text>
            </View>
            <View className='filter-divider'></View>
            <View className='filter-item' onClick={() => setShowFilter(!showFilter)}>
              <Text>价格</Text>
              <Text className='filter-value'>{getPriceFilterText()}</Text>
            </View>
            <View className='filter-divider'></View>
            <View className='filter-item' onClick={() => setShowFilter(!showFilter)}>
              <Text>设施</Text>
              <Text className='filter-value'>{getFacilityFilterText()}</Text>
            </View>
          </View>
          
          {/* 快捷标签区 */}
          <ScrollView className='tags-container' scrollX>
            {['亲子友好', '免费停车场', '含早餐', '豪华型', '商务出行', '近地铁'].map((tag) => (
              <View 
                key={tag} 
                className={`tag ${searchParams.selectedTags?.includes(tag) ? 'tag-active' : ''}`}
                onClick={() => {
                  setSearchParams(prev => {
                    const currentTags = prev.selectedTags || []
                    if (currentTags.includes(tag)) {
                      return { ...prev, selectedTags: currentTags.filter(t => t !== tag) }
                    } else {
                      return { ...prev, selectedTags: [...currentTags, tag] }
                    }
                  })
                }}
              >
                {tag}
              </View>
            ))}
          </ScrollView>
          
          {/* 查询按钮 */}
          <View className='search-button' onClick={handleSearch}>
            <Text className='search-button-icon'>🔍</Text>
            <Text className='search-button-text'>开始查询</Text>
          </View>
        </View>
      </View>

      {/* 详细筛选区域 */}
      {showFilter && renderFilterSection()}

      {/* 日期选择器 */}
      <DateSelector
        visible={showDateSelector}
        onCancel={handleDateCancel}
        onConfirm={handleDateConfirm}
        initialCheckIn={searchParams.checkInDate}
        initialCheckOut={searchParams.checkOutDate}
      />

      {/* 酒店列表 */}
      <ScrollView 
        className='hotel-container' 
        scrollY
        ref={scrollViewRef}
        enablePullDownRefresh={true}
        onPullDownRefresh={handleRefresh}
        onReachBottom={handleLoadMore}
        onReachBottomDistance={50}
        refreshing={refreshing}
        onScroll={handleScroll}
        scrollEventThrottle={16} // 约60fps
      >
        {/* 虚拟滚动容器 */}
        {loading && page === 1 ? (
          <LoadingComponent />
        ) : hotels.length > 0 ? (
          <>
            {/* 占位元素，用于模拟滚动高度 */}
            <View style={{ height: hotels.length * itemHeight, position: 'absolute', left: 0, right: 0 }} />
            {/* 可见酒店列表 */}
            {visibleHotels.map((hotel, index) => {
              // 计算每个酒店卡片的位置
              const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
              const actualIndex = startIndex + index
              return (
                <View 
                  key={hotel.id} 
                  style={{
                    position: 'absolute',
                    top: actualIndex * itemHeight,
                    left: 0,
                    right: 0
                  }}
                >
                  {renderHotelCard(hotel)}
                </View>
              )
            })}
            {loadingMore && (
              <LoadingMoreComponent />
            )}
            {!hasMore && hotels.length > 0 && (
              <NoMoreComponent />
            )}
          </>
        ) : (
          <EmptyComponent onResetFilter={handleResetFilter} />
        )}
      </ScrollView>
    </View>
  )
}