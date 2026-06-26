import axios from 'axios'

export const api =
  axios.create({
    baseURL:
      process.env
        .NEXT_PUBLIC_API_URL ||
      'https://lailacollections.my.id/api',

    headers: {
      'Content-Type':
        'application/json',
    },
  })

api.interceptors.request.use(
  (config) => {
    if (
      typeof window !==
      'undefined'
    ) {
      const token =
        localStorage.getItem(
          'token'
        )

      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`
      }
    }

    return config
  },
)

api.interceptors.response.use(
  (res) => res,

  (error) => {
    console.error('Axios Request Failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      responseData: error.response?.data,
      requestPayload: error.config?.data
    })
    if (error.response?.data) {
      console.warn('SERVER RESPONSE DETAIL:', JSON.stringify(error.response.data, null, 2))
    }

    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/cashier/login-pin') &&
      !error.config?.url?.includes('/auth/login')
    ) {

      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('storeId')
      localStorage.removeItem('cashier')
      localStorage.removeItem('cashierActive')
      localStorage.removeItem('currentShiftId')

      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)