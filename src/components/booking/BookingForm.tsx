'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getDb } from '@/lib/firebase/client'
import { Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react'

export default function BookingForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: '',
    bookingDate: '',
    bookingTime: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { addDoc, collection } = await import('firebase/firestore')
      await addDoc(collection(db, 'bookings'), {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        service_type: formData.serviceType,
        booking_date: formData.bookingDate,
        booking_time: formData.bookingTime,
        message: formData.message || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      {
        setSubmitted(true)
        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          serviceType: '',
          bookingDate: '',
          bookingTime: '',
          message: '',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      alert('예약 신청 중 오류가 발생했습니다. 전화로 문의해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (submitted) {
    return (
      <Card className="border-[#F8C3BF] bg-[#FDF4F3]">
        <CardContent className="pt-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FDECEA] mb-4">
            <svg
              className="w-8 h-8 text-[#F46E65]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">예약 신청이 완료되었습니다!</h3>
          <p className="text-gray-600 mb-6">
            빠른 시일 내에 확인 후 연락드리겠습니다.
            <br />
            급하신 경우 전화로 문의해 주세요.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline">
            새로운 예약 신청
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">예약 신청서</CardTitle>
        <p className="text-sm text-gray-600">
          아래 양식을 작성해 주시면 확인 후 연락드리겠습니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              이름 <span className="text-[#F46E65]">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              연락처 <span className="text-[#F46E65]">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="010-1234-5678"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              이메일 (선택)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType" className="flex items-center gap-2">
              서비스 종류 <span className="text-[#F46E65]">*</span>
            </Label>
            <Select value={formData.serviceType} onValueChange={(value) => handleChange('serviceType', value)} required>
              <SelectTrigger>
                <SelectValue placeholder="서비스를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shop">샵 서비스</SelectItem>
                <SelectItem value="onsite">출장 메이크업</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                희망 날짜 <span className="text-[#F46E65]">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.bookingDate}
                onChange={(e) => handleChange('bookingDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                희망 시간 <span className="text-[#F46E65]">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.bookingTime}
                onChange={(e) => handleChange('bookingTime', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              요청사항 (선택)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="특별히 요청하실 사항이 있으시면 작성해 주세요."
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#F46E65] hover:bg-[#E2564C]"
            size="lg"
            disabled={loading}
          >
            {loading ? '신청 중...' : '예약 신청하기'}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            예약 신청 후 1-2일 내에 확인 연락을 드립니다.
            <br />
            급하신 경우 <a href="tel:02-323-3321" className="text-[#F46E65] hover:underline">02-323-3321</a>로 전화 주세요.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
