export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          role: string
          venue_access: string[] | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          name: string
          role?: string
          venue_access?: string[] | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          role?: string
          venue_access?: string[] | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          first_order_at: string | null
          id: string
          last_order_at: string | null
          name: string
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          description: string | null
          dj_name: string | null
          doors_open: string | null
          end_time: string | null
          featured_image_url: string | null
          id: string
          is_auto_generated: boolean | null
          is_featured: boolean | null
          name: string
          sale_end: string | null
          sale_start: string | null
          slug: string
          start_time: string
          status: string
          total_capacity: number
          venue_capacity: number | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          description?: string | null
          dj_name?: string | null
          doors_open?: string | null
          end_time?: string | null
          featured_image_url?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_featured?: boolean | null
          name: string
          sale_end?: string | null
          sale_start?: string | null
          slug: string
          start_time: string
          status?: string
          total_capacity: number
          venue_capacity?: number | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          description?: string | null
          dj_name?: string | null
          doors_open?: string | null
          end_time?: string | null
          featured_image_url?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_featured?: boolean | null
          name?: string
          sale_end?: string | null
          sale_start?: string | null
          slug?: string
          start_time?: string
          status?: string
          total_capacity?: number
          venue_capacity?: number | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          quantity: number
          ticket_type_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          quantity: number
          ticket_type_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          quantity?: number
          ticket_type_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone: string | null
          event_id: string
          id: string
          idempotency_key: string | null
          order_number: string
          payment_provider: string | null
          payment_status: string
          payment_transaction_id: string | null
          status: string
          subtotal: number
          total: number
          turnstile_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          event_id: string
          id?: string
          idempotency_key?: string | null
          order_number: string
          payment_provider?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          status?: string
          subtotal: number
          total: number
          turnstile_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          event_id?: string
          id?: string
          idempotency_key?: string | null
          order_number?: string
          payment_provider?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          turnstile_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          event_id: string
          id: string
          max_per_order: number | null
          name: string
          price: number
          quantity_sold: number | null
          quantity_total: number
          sale_end: string | null
          sale_start: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          event_id: string
          id?: string
          max_per_order?: number | null
          name: string
          price: number
          quantity_sold?: number | null
          quantity_total: number
          sale_end?: string | null
          sale_start?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          event_id?: string
          id?: string
          max_per_order?: number | null
          name?: string
          price?: number
          quantity_sold?: number | null
          quantity_total?: number
          sale_end?: string | null
          sale_start?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string | null
          display_code: string
          id: string
          order_id: string
          qr_code: string
          qr_signature: string
          status: string
          ticket_type_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          display_code: string
          id?: string
          order_id: string
          qr_code: string
          qr_signature: string
          status?: string
          ticket_type_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          display_code?: string
          id?: string
          order_id?: string
          qr_code?: string
          qr_signature?: string
          status?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vip_inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          notes: string | null
          party_size: number | null
          phone: string
          status: string
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          party_size?: number | null
          phone: string
          status?: string
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          party_size?: number | null
          phone?: string
          status?: string
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_inquiries_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      friday_event_template: {
        Row: {
          id: string
          venue_id: string
          event_name: string
          description: string | null
          doors_open_time: string
          start_time: string
          end_time: string
          default_status: string
          weeks_ahead: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          event_name?: string
          description?: string | null
          doors_open_time?: string
          start_time?: string
          end_time?: string
          default_status?: string
          weeks_ahead?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          event_name?: string
          description?: string | null
          doors_open_time?: string
          start_time?: string
          end_time?: string
          default_status?: string
          weeks_ahead?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friday_event_template_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      friday_template_ticket_types: {
        Row: {
          id: string
          template_id: string
          name: string
          price: number
          currency: string
          quantity_total: number
          max_per_order: number | null
          description: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          price: number
          currency?: string
          quantity_total: number
          max_per_order?: number | null
          description?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          price?: number
          currency?: string
          quantity_total?: number
          max_per_order?: number | null
          description?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "friday_template_ticket_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "friday_event_template"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_logs: {
        Row: {
          id: string
          ticket_id: string | null
          order_id: string | null
          event_id: string
          scanned_by: string | null
          scanned_at: string
          scan_result: string
          device_info: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          order_id?: string | null
          event_id: string
          scanned_by?: string | null
          scanned_at?: string
          scan_result: string
          device_info?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string | null
          order_id?: string | null
          event_id?: string
          scanned_by?: string | null
          scanned_at?: string
          scan_result?: string
          device_info?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_in_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_entries: {
        Row: {
          id: string
          event_id: string
          name: string
          email: string | null
          phone: string | null
          plus_count: number | null
          added_by: string | null
          added_by_name: string | null
          status: string
          checked_in_at: string | null
          checked_in_by: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          email?: string | null
          phone?: string | null
          plus_count?: number | null
          added_by?: string | null
          added_by_name?: string | null
          status?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          plus_count?: number | null
          added_by?: string | null
          added_by_name?: string | null
          status?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_entries_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_entries_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_tickets: {
        Args: {
          p_ticket_type_id: string
          p_event_id: string
          p_quantity: number
        }
        Returns: {
          success: boolean
          error: string | null
          name: string | null
          price: number | null
          quantity: number | null
        }
      }
      release_tickets: {
        Args: {
          p_ticket_type_id: string
          p_quantity: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Shorthand types
export type Venue = Tables<'venues'>
export type Event = Tables<'events'>
export type TicketType = Tables<'ticket_types'>
export type Customer = Tables<'customers'>
export type AdminUser = Tables<'admin_users'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Ticket = Tables<'tickets'>
export type VipInquiry = Tables<'vip_inquiries'>
export type FridayEventTemplate = Tables<'friday_event_template'>
export type FridayTemplateTicketType = Tables<'friday_template_ticket_types'>
export type CheckInLog = Tables<'check_in_logs'>
export type GuestListEntry = Tables<'guest_list_entries'>

// Event with relations
export type EventWithTicketTypes = Event & {
  ticket_types: TicketType[]
  venues?: Venue
}

// Order with relations
export type OrderWithDetails = Order & {
  order_items: (OrderItem & { ticket_types: TicketType })[]
  tickets: Ticket[]
  events: Event
  customers: Customer
}
