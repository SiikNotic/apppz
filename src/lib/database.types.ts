export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string
          id: string
          processed_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          access_code: string | null
          apartment: string | null
          city: string
          contact_preference: string | null
          created_at: string
          delivery_notes: string | null
          dog_warning: boolean
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          state: string
          street: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          access_code?: string | null
          apartment?: string | null
          city: string
          contact_preference?: string | null
          created_at?: string
          delivery_notes?: string | null
          dog_warning?: boolean
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          state: string
          street: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          access_code?: string | null
          apartment?: string | null
          city?: string
          contact_preference?: string | null
          created_at?: string
          delivery_notes?: string | null
          dog_warning?: boolean
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          id: string
          image_url: string | null
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      crusts: {
        Row: {
          active: boolean
          extra_price: number
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          extra_price?: number
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          extra_price?: number
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          assigned_at: string
          delivered_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          order_id: string
          picked_up_at: string | null
          proof_photo_url: string | null
          route_order: number | null
          signature_url: string | null
          status: Database["public"]["Enums"]["delivery_assignment_status"]
        }
        Insert: {
          assigned_at?: string
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          picked_up_at?: string | null
          proof_photo_url?: string | null
          route_order?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_assignment_status"]
        }
        Update: {
          assigned_at?: string
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          picked_up_at?: string | null
          proof_photo_url?: string | null
          route_order?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_shifts: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          driver_id: string
          id: string
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          driver_id: string
          id?: string
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          current_lat: number | null
          current_lng: number | null
          license_plate: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string
          vehicle_make_id: string | null
          vehicle_model_id: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          current_lat?: number | null
          current_lng?: number | null
          license_plate?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id: string
          vehicle_make_id?: string | null
          vehicle_model_id?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          current_lat?: number | null
          current_lng?: number | null
          license_plate?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string
          vehicle_make_id?: string | null
          vehicle_model_id?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_make_id_fkey"
            columns: ["vehicle_make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          created_at: string
          date_hired: string | null
          employee_code: string | null
          employment_status: string
          internal_notes: string | null
          monthly_salary: number | null
          position: string | null
          store_location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_hired?: string | null
          employee_code?: string | null
          employment_status?: string
          internal_notes?: string | null
          monthly_salary?: number | null
          position?: string | null
          store_location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_hired?: string | null
          employee_code?: string | null
          employment_status?: string
          internal_notes?: string | null
          monthly_salary?: number | null
          position?: string | null
          store_location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sensitive_info: {
        Row: {
          created_at: string
          drivers_license_number: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_contact_secondary_name: string | null
          emergency_contact_secondary_phone: string | null
          residential_city: string | null
          residential_state: string | null
          residential_street: string | null
          residential_zip: string | null
          secondary_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drivers_license_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_secondary_name?: string | null
          emergency_contact_secondary_phone?: string | null
          residential_city?: string | null
          residential_state?: string | null
          residential_street?: string | null
          residential_zip?: string | null
          secondary_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drivers_license_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_secondary_name?: string | null
          emergency_contact_secondary_phone?: string | null
          residential_city?: string | null
          residential_state?: string | null
          residential_street?: string | null
          residential_zip?: string | null
          secondary_phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_sensitive_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          min_stock: number
          name: string
          stock_quantity: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          stock_quantity?: number
          supplier?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          stock_quantity?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          order_id: string | null
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          order_id?: string | null
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          order_id?: string | null
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_report_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          report_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          report_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          report_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_report_messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "issue_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_report_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_reports: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          customer_id: string | null
          customer_last_read_at: string | null
          description: string | null
          id: string
          order_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          staff_last_read_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          customer_id?: string | null
          customer_last_read_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_last_read_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          customer_last_read_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_last_read_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_sizes: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          price: number
          size_cm: number | null
          size_inches: number | null
          sort_order: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          price: number
          size_cm?: number | null
          size_inches?: number | null
          sort_order?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
          size_cm?: number | null
          size_inches?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_sizes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          active: boolean
          base_price: number
          category_id: string | null
          created_at: string
          description: string | null
          free_toppings_limit: number
          id: string
          image_url: string | null
          is_customizable_pizza: boolean
          name: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          free_toppings_limit?: number
          id?: string
          image_url?: string | null
          is_customizable_pizza?: boolean
          name: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          free_toppings_limit?: number
          id?: string
          image_url?: string | null
          is_customizable_pizza?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          order_id: string | null
          payload: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          type: string
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type: string
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_item_toppings: {
        Row: {
          id: string
          order_item_id: string
          price: number
          topping_name: string
        }
        Insert: {
          id?: string
          order_item_id: string
          price?: number
          topping_name: string
        }
        Update: {
          id?: string
          order_item_id?: string
          price?: number
          topping_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_toppings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          crust_name: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          order_id: string
          quantity: number
          sauce_name: string | null
          size_name: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          crust_name?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          order_id: string
          quantity?: number
          sauce_name?: string | null
          size_name?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          crust_name?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          order_id?: string
          quantity?: number
          sauce_name?: string | null
          size_name?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_transitions: {
        Row: {
          from_status: string
          to_status: string
        }
        Insert: {
          from_status: string
          to_status: string
        }
        Update: {
          from_status?: string
          to_status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          address_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          idempotency_key: string | null
          label_printed_at: string | null
          notes: string | null
          order_number: number
          order_type: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          promotion_id: string | null
          status: string
          subtotal: number
          tax: number
          tip_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          delivery_fee?: number
          discount?: number
          id?: string
          idempotency_key?: string | null
          label_printed_at?: string | null
          notes?: string | null
          order_number?: number
          order_type?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          promotion_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tip_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          delivery_fee?: number
          discount?: number
          id?: string
          idempotency_key?: string | null
          label_printed_at?: string | null
          notes?: string | null
          order_number?: number
          order_type?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          promotion_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tip_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          order_id: string
          provider: string
          provider_payment_intent_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id: string
          provider?: string
          provider_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id?: string
          provider?: string
          provider_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          description: string
          key: string
        }
        Insert: {
          description: string
          key: string
        }
        Update: {
          description?: string
          key?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          expires_at: string | null
          id: string
          order_id: string | null
          promotion_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          expires_at?: string | null
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          expires_at?: string | null
          id?: string
          order_id?: string | null
          promotion_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          menu_item_id: string
          sort_order: number
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          menu_item_id: string
          sort_order?: number
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          menu_item_id?: string
          sort_order?: number
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_role: Database["public"]["Enums"]["company_role"] | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_company_staff: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          terminated_at: string | null
          terminated_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_role?: Database["public"]["Enums"]["company_role"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_company_staff?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          terminated_at?: string | null
          terminated_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_role?: Database["public"]["Enums"]["company_role"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_company_staff?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          terminated_at?: string | null
          terminated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_banners: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          menu_item_id: string | null
          original_price: number | null
          promo_price: number | null
          promotion_id: string | null
          sort_order: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          menu_item_id?: string | null
          original_price?: number | null
          promo_price?: number | null
          promotion_id?: string | null
          sort_order?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          menu_item_id?: string | null
          original_price?: number | null
          promo_price?: number | null
          promotion_id?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_banners_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_redemptions: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          promotion_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          applicable_category_id: string | null
          applicable_menu_item_id: string | null
          buy_x_quantity: number | null
          code: string | null
          created_at: string
          daily_end_time: string | null
          daily_start_time: string | null
          ends_at: string | null
          free_item_menu_item_id: string | null
          get_y_menu_item_id: string | null
          id: string
          min_customer_tier: string | null
          min_order_amount: number | null
          name: string
          starts_at: string | null
          type: Database["public"]["Enums"]["promotion_type"]
          usage_limit: number | null
          usage_limit_per_customer: number | null
          value: number
        }
        Insert: {
          active?: boolean
          applicable_category_id?: string | null
          applicable_menu_item_id?: string | null
          buy_x_quantity?: number | null
          code?: string | null
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at?: string | null
          free_item_menu_item_id?: string | null
          get_y_menu_item_id?: string | null
          id?: string
          min_customer_tier?: string | null
          min_order_amount?: number | null
          name: string
          starts_at?: string | null
          type: Database["public"]["Enums"]["promotion_type"]
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          value?: number
        }
        Update: {
          active?: boolean
          applicable_category_id?: string | null
          applicable_menu_item_id?: string | null
          buy_x_quantity?: number | null
          code?: string | null
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at?: string | null
          free_item_menu_item_id?: string | null
          get_y_menu_item_id?: string | null
          id?: string
          min_customer_tier?: string | null
          min_order_amount?: number | null
          name?: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promotion_type"]
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_applicable_category_id_fkey"
            columns: ["applicable_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_applicable_menu_item_id_fkey"
            columns: ["applicable_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_free_item_menu_item_id_fkey"
            columns: ["free_item_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_get_y_menu_item_id_fkey"
            columns: ["get_y_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_min_customer_tier_fkey"
            columns: ["min_customer_tier"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["name"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          item_size_id: string | null
          menu_item_id: string
          quantity: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          item_size_id?: string | null
          menu_item_id: string
          quantity: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          item_size_id?: string | null
          menu_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_item_size_id_fkey"
            columns: ["item_size_id"]
            isOneToOne: false
            referencedRelation: "item_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          name: string
          points_cost: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          points_cost: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          points_cost?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          points_spent: number
          redeemed_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          points_spent: number
          redeemed_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "reward_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          active: boolean
          benefits: Json
          id: string
          min_lifetime_points: number
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          benefits?: Json
          id?: string
          min_lifetime_points?: number
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          benefits?: Json
          id?: string
          min_lifetime_points?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      rewards_accounts: {
        Row: {
          lifetime_points: number
          points_balance: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          lifetime_points?: number
          points_balance?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          lifetime_points?: number
          points_balance?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_accounts_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["name"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["company_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["company_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["company_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      sauces: {
        Row: {
          active: boolean
          extra_price: number
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          extra_price?: number
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          extra_price?: number
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_shifts: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_closures: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_hours: {
        Row: {
          close_time: string
          day_of_week: number
          is_closed: boolean
          open_time: string
        }
        Insert: {
          close_time?: string
          day_of_week: number
          is_closed?: boolean
          open_time?: string
        }
        Update: {
          close_time?: string
          day_of_week?: number
          is_closed?: boolean
          open_time?: string
        }
        Relationships: []
      }
      topping_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          quantity: number
          topping_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity: number
          topping_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity?: number
          topping_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topping_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topping_ingredients_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
      }
      toppings: {
        Row: {
          active: boolean
          id: string
          image_url: string | null
          ingredient_id: string | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          id?: string
          image_url?: string | null
          ingredient_id?: string | null
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          id?: string
          image_url?: string | null
          ingredient_id?: string | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "toppings_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_makes: {
        Row: {
          id: string
          name: string
          sort_order: number
          vehicle_type: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          vehicle_type?: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          vehicle_type?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          id: string
          make_id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          make_id: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          make_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_points: {
        Args: { p_delta: number; p_reason: string; p_user_id: string }
        Returns: {
          lifetime_points: number
          points_balance: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rewards_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_driver_to_order: {
        Args: { p_driver_id: string; p_order_id: string }
        Returns: {
          assigned_at: string
          delivered_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          order_id: string
          picked_up_at: string | null
          proof_photo_url: string | null
          route_order: number | null
          signature_url: string | null
          status: Database["public"]["Enums"]["delivery_assignment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_cart_price: {
        Args: {
          p_cart: Json
          p_customer_id?: string
          p_order_type?: string
          p_promo_code?: string
        }
        Returns: Json
      }
      create_order:
        | {
            Args: {
              p_address_id: string
              p_address_text: string
              p_cart: Json
              p_customer_name: string
              p_idempotency_key: string
              p_notes: string
              p_order_type: string
              p_payment_method: string
              p_phone: string
              p_promo_code?: string
            }
            Returns: {
              address: string | null
              address_id: string | null
              created_at: string
              customer_id: string | null
              customer_name: string
              delivery_fee: number
              discount: number
              id: string
              idempotency_key: string | null
              label_printed_at: string | null
              notes: string | null
              order_number: number
              order_type: string
              payment_method: string | null
              payment_status: Database["public"]["Enums"]["payment_status"]
              phone: string | null
              promotion_id: string | null
              status: string
              subtotal: number
              tax: number
              tip_amount: number
              total: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_address_id: string
              p_address_text: string
              p_cart: Json
              p_customer_name: string
              p_idempotency_key: string
              p_notes: string
              p_order_type: string
              p_payment_method: string
              p_phone: string
              p_promo_code?: string
              p_tip_amount?: number
            }
            Returns: {
              address: string | null
              address_id: string | null
              created_at: string
              customer_id: string | null
              customer_name: string
              delivery_fee: number
              discount: number
              id: string
              idempotency_key: string | null
              label_printed_at: string | null
              notes: string | null
              order_number: number
              order_type: string
              payment_method: string | null
              payment_status: Database["public"]["Enums"]["payment_status"]
              phone: string | null
              promotion_id: string | null
              status: string
              subtotal: number
              tax: number
              tip_amount: number
              total: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      driver_confirm_cash_collected: {
        Args: { p_order_id: string }
        Returns: {
          address: string | null
          address_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          idempotency_key: string | null
          label_printed_at: string | null
          notes: string | null
          order_number: number
          order_type: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          promotion_id: string | null
          status: string
          subtotal: number
          tax: number
          tip_amount: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      driver_update_assignment: {
        Args: {
          p_assignment_id: string
          p_new_status: Database["public"]["Enums"]["delivery_assignment_status"]
          p_notes?: string
        }
        Returns: {
          assigned_at: string
          delivered_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          order_id: string
          picked_up_at: string | null
          proof_photo_url: string | null
          route_order: number | null
          signature_url: string | null
          status: Database["public"]["Enums"]["delivery_assignment_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_decrypted_secret: { Args: { secret_name: string }; Returns: string }
      get_order_tracking: {
        Args: { p_order_id: string }
        Returns: {
          address: string | null
          address_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          idempotency_key: string | null
          label_printed_at: string | null
          notes: string | null
          order_number: number
          order_type: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          promotion_id: string | null
          status: string
          subtotal: number
          tax: number
          tip_amount: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_store_status: { Args: { check_time?: string }; Returns: Json }
      has_permission: { Args: { perm: string }; Returns: boolean }
      is_company_staff: { Args: never; Returns: boolean }
      is_driver_assigned_to_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_store_open: { Args: { check_time?: string }; Returns: boolean }
      redeem_catalog_reward: {
        Args: { p_reward_id: string }
        Returns: {
          lifetime_points: number
          points_balance: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rewards_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_points: {
        Args: { p_points: number; p_reason: string }
        Returns: {
          lifetime_points: number
          points_balance: number
          tier: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rewards_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      company_role:
        | "owner"
        | "admin"
        | "manager"
        | "kitchen"
        | "cashier"
        | "driver"
        | "staff"
      delivery_assignment_status:
        | "assigned"
        | "en_route"
        | "delivered"
        | "failed"
      driver_status: "offline" | "available" | "on_delivery"
      notification_channel: "email" | "push" | "sms" | "in_app"
      notification_status: "pending" | "sent" | "failed"
      payment_status:
        | "pending"
        | "authorized"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      promotion_type:
        | "percentage"
        | "fixed_amount"
        | "free_item"
        | "free_delivery"
        | "bonus_points"
        | "buy_x_get_y"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      company_role: [
        "owner",
        "admin",
        "manager",
        "kitchen",
        "cashier",
        "driver",
        "staff",
      ],
      delivery_assignment_status: [
        "assigned",
        "en_route",
        "delivered",
        "failed",
      ],
      driver_status: ["offline", "available", "on_delivery"],
      notification_channel: ["email", "push", "sms", "in_app"],
      notification_status: ["pending", "sent", "failed"],
      payment_status: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      promotion_type: [
        "percentage",
        "fixed_amount",
        "free_item",
        "free_delivery",
        "bonus_points",
        "buy_x_get_y",
      ],
    },
  },
} as const
