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

    if (
      error.response
        ?.status === 401
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