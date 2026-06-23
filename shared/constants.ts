export const APP_VERSION = '1.1.0'

// Factor de conversión Impact.magnitude de m/s² a raw/16
// Con MPU-6050 en ±16g: 1g = 2048 LSB raw → /16 = 128 unidades
// 1g = 9.80665 m/s² → factor = 128 / 9.80665 ≈ 13.06
export const RAW16_FACTOR = 13.06
