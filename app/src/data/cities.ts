// 城市数据层
// 数据来源:
// - 常住人口: 各市 2023 年统计公报(约数)
// - 平均工资: 各市统计局 2023 年城镇非私营单位就业人员年平均工资(无市级数据时用省级值)
//   省级数据来自《中国统计年鉴 2024》/ 国家统计局
// - rich600: 600 万资产家庭户数(万户), 来自《2025 胡润财富报告》(截至 2025-01-01);
//   无直接数据的城市为 null, 引擎用工资系数推算

export interface City {
  name: string
  province: string
  pop: number // 常住人口, 万
  wage: number // 城镇非私营单位年平均工资, 元 (2023)
  rich600: number | null // 600万资产家庭, 万户
  hot?: boolean
}

export const NATIONAL_WAGE = 124110 // 2024 全国城镇非私营单位年平均工资(国家统计局, 2025-05 发布)

// 2023 年各省城镇非私营单位年平均工资(元), 国家统计局
export const PROVINCE_WAGE: Record<string, number> = {
  上海: 229337, 北京: 218312, 西藏: 165004, 天津: 138007, 浙江: 133045,
  广东: 131418, 江苏: 125102, 青海: 121457, 宁夏: 117681, 海南: 114572,
  重庆: 113653, 新疆: 112305, 四川: 110160, 湖北: 109227, 内蒙古: 108856,
  福建: 108520, 山东: 107131, 陕西: 106969, 云南: 106769, 安徽: 103688,
  贵州: 102010, 甘肃: 99124, 辽宁: 97330, 湖南: 97015, 广西: 96184,
  黑龙江: 95750, 山西: 95025, 吉林: 94937, 河北: 94818, 江西: 92794,
  河南: 84156,
}

export const CITIES: City[] = [
  { name: '北京', province: '北京', pop: 2186, wage: 218312, rich600: 71.9, hot: true },
  { name: '上海', province: '上海', pop: 2487, wage: 229337, rich600: 62.2, hot: true },
  { name: '深圳', province: '广东', pop: 1779, wage: 174640, rich600: 17.5, hot: true },
  { name: '广州', province: '广东', pop: 1883, wage: 158318, rich600: 16.8, hot: true },
  { name: '杭州', province: '浙江', pop: 1252, wage: 161660, rich600: 13.5, hot: true },
  { name: '成都', province: '四川', pop: 2140, wage: 127093, rich600: null, hot: true },
  { name: '南京', province: '江苏', pop: 955, wage: 159659, rich600: null, hot: true },
  { name: '武汉', province: '湖北', pop: 1377, wage: 109227, rich600: null, hot: true },
  { name: '苏州', province: '江苏', pop: 1296, wage: 138732, rich600: null, hot: true },
  { name: '西安', province: '陕西', pop: 1308, wage: 128675, rich600: null, hot: true },
  { name: '重庆', province: '重庆', pop: 3191, wage: 117446, rich600: null, hot: true },
  { name: '天津', province: '天津', pop: 1364, wage: 138007, rich600: null, hot: true },
  { name: '长沙', province: '湖南', pop: 1051, wage: 97015, rich600: null },
  { name: '郑州', province: '河南', pop: 1301, wage: 84156, rich600: null },
  { name: '东莞', province: '广东', pop: 1049, wage: 131418, rich600: null },
  { name: '佛山', province: '广东', pop: 961, wage: 115084, rich600: null },
  { name: '宁波', province: '浙江', pop: 970, wage: 138033, rich600: 10.7 },
  { name: '合肥', province: '安徽', pop: 985, wage: 103688, rich600: null },
  { name: '青岛', province: '山东', pop: 1037, wage: 107131, rich600: null },
  { name: '济南', province: '山东', pop: 944, wage: 133232, rich600: null },
  { name: '沈阳', province: '辽宁', pop: 920, wage: 114821, rich600: null },
  { name: '哈尔滨', province: '黑龙江', pop: 939, wage: 95750, rich600: null },
  { name: '昆明', province: '云南', pop: 868, wage: 106769, rich600: null },
  { name: '大连', province: '辽宁', pop: 754, wage: 119793, rich600: null },
  { name: '无锡', province: '江苏', pop: 750, wage: 139697, rich600: null },
  { name: '厦门', province: '福建', pop: 535, wage: 108520, rich600: null },
  { name: '福州', province: '福建', pop: 847, wage: 108520, rich600: null },
  { name: '温州', province: '浙江', pop: 976, wage: 122163, rich600: null },
  { name: '常州', province: '江苏', pop: 538, wage: 134829, rich600: null },
  { name: '珠海', province: '广东', pop: 249, wage: 133869, rich600: null },
  { name: '泉州', province: '福建', pop: 888, wage: 108520, rich600: null },
  { name: '南通', province: '江苏', pop: 775, wage: 125102, rich600: null },
  { name: '烟台', province: '山东', pop: 706, wage: 107131, rich600: null },
  { name: '太原', province: '山西', pop: 545, wage: 95025, rich600: null },
  { name: '贵阳', province: '贵州', pop: 640, wage: 102010, rich600: null },
  { name: '南昌', province: '江西', pop: 657, wage: 92794, rich600: null },
  { name: '石家庄', province: '河北', pop: 1123, wage: 94818, rich600: null },
  { name: '兰州', province: '甘肃', pop: 443, wage: 99124, rich600: null },
  { name: '乌鲁木齐', province: '新疆', pop: 408, wage: 112305, rich600: null },
  { name: '海口', province: '海南', pop: 294, wage: 114572, rich600: null },
  { name: '银川', province: '宁夏', pop: 290, wage: 117681, rich600: null },
  { name: '西宁', province: '青海', pop: 248, wage: 121457, rich600: null },
  { name: '呼和浩特', province: '内蒙古', pop: 355, wage: 108856, rich600: null },
  { name: '拉萨', province: '西藏', pop: 87, wage: 165004, rich600: null },
  { name: '南宁', province: '广西', pop: 889, wage: 96184, rich600: null },
  { name: '长春', province: '吉林', pop: 910, wage: 94937, rich600: null },
]
