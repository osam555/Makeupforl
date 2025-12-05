'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Phone, Mail, MessageSquare, X } from 'lucide-react'

interface Booking {
  id: string
  name: string
  phone: string
  email: string | null
  service_type: string
  booking_date: string
  booking_time: string
  message: string | null
  status: string
  created_at: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')

  // Simple password authentication (환경변수로 관리 권장)
  const ADMIN_PASSWORD = '8888' // 실제 운영 시 환경변수로 변경 필요!

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      loadBookings()
    } else {
      alert('비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
  }

  const loadBookings = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading bookings:', error)
      } else {
        setBookings(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (id: string, newStatus: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) {
        console.error('Error updating booking:', error)
        alert('상태 업데이트 중 오류가 발생했습니다.')
      } else {
        loadBookings() // Reload after update
      }
    } catch (error) {
      console.error('Error:', error)
      alert('상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings()
    }
  }, [filter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'confirmed':
        return '확정'
      case 'completed':
        return '완료'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">관리자 로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700">
                로그인
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
            <Button
              variant="outline"
              onClick={() => setIsAuthenticated(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              로그아웃
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                size="sm"
                className={filter === status ? 'bg-pink-600 hover:bg-pink-700' : ''}
              >
                {status === 'all' ? '전체' : getStatusText(status)}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={loadBookings}
              size="sm"
              className="ml-auto"
            >
              새로고침
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {bookings.filter((b) => b.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">대기중</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {bookings.filter((b) => b.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600">확정</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">완료</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
              <div className="text-sm text-gray-600">전체</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-pink-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">예약이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Booking Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusText(booking.status)}
                        </Badge>
                        <Badge variant="outline">
                          {booking.service_type === 'shop' ? '샵 서비스' : '출장 메이크업'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{booking.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${booking.phone}`} className="text-pink-600 hover:underline">
                            {booking.phone}
                          </a>
                        </div>
                        {booking.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a href={`mailto:${booking.email}`} className="text-pink-600 hover:underline">
                              {booking.email}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(booking.booking_date).toLocaleDateString('ko-KR')}</span>
                          <Clock className="h-4 w-4 text-gray-400 ml-2" />
                          <span>{booking.booking_time}</span>
                        </div>
                      </div>

                      {booking.message && (
                        <div className="flex items-start gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                          <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{booking.message}</span>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        신청일: {new Date(booking.created_at).toLocaleString('ko-KR')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {booking.status === 'pending' && (
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          확정
                        </Button>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          완료
                        </Button>
                      )}
                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
