export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          order_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          order_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          order_position?: number
          created_at?: string
          updated_at?: string
        }
      }
      galleries: {
        Row: {
          id: string
          title: string
          description: string | null
          category_id: string | null
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category_id?: string | null
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category_id?: string | null
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      images: {
        Row: {
          id: string
          url: string
          alt_text: string | null
          gallery_id: string | null
          order_position: number
          created_at: string
        }
        Insert: {
          id?: string
          url: string
          alt_text?: string | null
          gallery_id?: string | null
          order_position?: number
          created_at?: string
        }
        Update: {
          id?: string
          url?: string
          alt_text?: string | null
          gallery_id?: string | null
          order_position?: number
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          title: string
          content: string
          author_name: string | null
          image_url: string | null
          rating: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_name?: string | null
          image_url?: string | null
          rating?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_name?: string | null
          image_url?: string | null
          rating?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
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
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          service_type: string
          booking_date: string
          booking_time: string
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          service_type?: string
          booking_date?: string
          booking_time?: string
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          content: string
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
