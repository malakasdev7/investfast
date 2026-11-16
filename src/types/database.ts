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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string
          created_at: string
          currency: string
          current_balance: number
          icon: string
          id: string
          initial_balance: number
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          currency?: string
          current_balance?: number
          icon?: string
          id?: string
          initial_balance?: number
          name: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          currency?: string
          current_balance?: number
          icon?: string
          id?: string
          initial_balance?: number
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          description: string
          id: string
          read: boolean
          severity: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          read?: boolean
          severity?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          read?: boolean
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          price: number
          price_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          price: number
          price_date: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          price?: number
          price_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_prices_user_id_asset_id_fkey"
            columns: ["user_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: string
          created_at: string
          current_price: number
          id: string
          institution: string | null
          name: string
          notes: string | null
          price_updated_at: string | null
          status: string
          subclass: string | null
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class: string
          created_at?: string
          current_price?: number
          id?: string
          institution?: string | null
          name: string
          notes?: string | null
          price_updated_at?: string | null
          status?: string
          subclass?: string | null
          ticker: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          current_price?: number
          id?: string
          institution?: string | null
          name?: string
          notes?: string | null
          price_updated_at?: string | null
          status?: string
          subclass?: string | null
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          name: string
          path: string
          size_bytes: number
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          name: string
          path: string
          size_bytes: number
          transaction_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          name?: string
          path?: string
          size_bytes?: number
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_user_id_transaction_id_fkey"
            columns: ["user_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          status?: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dividends: {
        Row: {
          amount: number
          asset_id: string
          created_at: string
          id: string
          investment_transaction_id: string
          payment_date: string
          portfolio_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          created_at?: string
          id?: string
          investment_transaction_id: string
          payment_date: string
          portfolio_id: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string
          id?: string
          investment_transaction_id?: string
          payment_date?: string
          portfolio_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_user_id_asset_id_fkey"
            columns: ["user_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "dividends_user_id_investment_transaction_id_fkey"
            columns: ["user_id", "investment_transaction_id"]
            isOneToOne: true
            referencedRelation: "investment_transactions"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "dividends_user_id_portfolio_id_fkey"
            columns: ["user_id", "portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          goal_id: string
          id: string
          investment_transaction_id: string | null
          notes: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date: string
          created_at?: string
          goal_id: string
          id?: string
          investment_transaction_id?: string | null
          notes?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          investment_transaction_id?: string | null
          notes?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_user_id_goal_id_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "goal_contributions_user_id_investment_transaction_id_fkey"
            columns: ["user_id", "investment_transaction_id"]
            isOneToOne: false
            referencedRelation: "investment_transactions"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "goal_contributions_user_id_transaction_id_fkey"
            columns: ["user_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      goals: {
        Row: {
          accumulated_amount: number
          color: string
          created_at: string
          deadline: string
          description: string | null
          id: string
          name: string
          status: string
          target_amount: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_amount?: number
          color?: string
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          name: string
          status?: string
          target_amount: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          accumulated_amount?: number
          color?: string
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          asset_id: string
          average_price: number
          cost: number
          created_at: string
          first_purchase: string | null
          id: string
          income: number
          portfolio_id: string
          quantity: number
          realized_profit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          average_price?: number
          cost?: number
          created_at?: string
          first_purchase?: string | null
          id?: string
          income?: number
          portfolio_id: string
          quantity?: number
          realized_profit?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          asset_id?: string
          average_price?: number
          cost?: number
          created_at?: string
          first_purchase?: string | null
          id?: string
          income?: number
          portfolio_id?: string
          quantity?: number
          realized_profit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_user_id_asset_id_fkey"
            columns: ["user_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "holdings_user_id_portfolio_id_fkey"
            columns: ["user_id", "portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      investment_transactions: {
        Row: {
          account_id: string | null
          asset_id: string
          created_at: string
          destination_portfolio_id: string | null
          fees: number
          id: string
          notes: string | null
          operation_date: string
          operation_sequence: number
          portfolio_id: string
          quantity: number
          total_amount: number
          type: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          asset_id: string
          created_at?: string
          destination_portfolio_id?: string | null
          fees?: number
          id?: string
          notes?: string | null
          operation_date: string
          operation_sequence?: never
          portfolio_id: string
          quantity?: number
          total_amount?: number
          type: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          asset_id?: string
          created_at?: string
          destination_portfolio_id?: string | null
          fees?: number
          id?: string
          notes?: string | null
          operation_date?: string
          operation_sequence?: never
          portfolio_id?: string
          quantity?: number
          total_amount?: number
          type?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_user_id_account_id_fkey"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "investment_transactions_user_id_asset_id_fkey"
            columns: ["user_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "investment_transactions_user_id_destination_portfolio_id_fkey"
            columns: ["user_id", "destination_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "investment_transactions_user_id_portfolio_id_fkey"
            columns: ["user_id", "portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      portfolios: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          email: string
          id: string
          name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email?: string
          id?: string
          name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email?: string
          id?: string
          name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          anchor_day: number
          category_id: string | null
          created_at: string
          description: string
          destination_account_id: string | null
          end_date: string | null
          frequency: string
          id: string
          next_date: string
          notes: string | null
          start_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          anchor_day: number
          category_id?: string | null
          created_at?: string
          description: string
          destination_account_id?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          next_date: string
          notes?: string | null
          start_date: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          anchor_day?: number
          category_id?: string | null
          created_at?: string
          description?: string
          destination_account_id?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          next_date?: string
          notes?: string | null
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_user_id_account_id_fkey"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "recurring_transactions_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "recurring_transactions_user_id_destination_account_id_fkey"
            columns: ["user_id", "destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string
          destination_account_id: string | null
          id: string
          notes: string | null
          recurring_id: string | null
          status: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          destination_account_id?: string | null
          id?: string
          notes?: string | null
          recurring_id?: string | null
          status?: string
          transaction_date: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          destination_account_id?: string | null
          id?: string
          notes?: string | null
          recurring_id?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_account_id_fkey"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_destination_account_id_fkey"
            columns: ["user_id", "destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_recurring_id_fkey"
            columns: ["user_id", "recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string
          metadata: Json
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          metadata?: Json
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          metadata?: Json
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          model: string | null
          role: string
          token_count: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          role: string
          token_count?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          model?: string | null
          role?: string
          token_count?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_calls: {
        Row: {
          arguments: Json
          asset_id: string | null
          conversation_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          executed_at: string
          id: string
          message_id: string | null
          portfolio_id: string | null
          result: Json | null
          status: string
          tool_name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arguments?: Json
          asset_id?: string | null
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          id?: string
          message_id?: string | null
          portfolio_id?: string | null
          result?: Json | null
          status?: string
          tool_name: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          arguments?: Json
          asset_id?: string | null
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          id?: string
          message_id?: string | null
          portfolio_id?: string | null
          result?: Json | null
          status?: string
          tool_name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_calls_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_calls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_calls_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_insights: {
        Row: {
          analyzed_at: string
          asset_id: string | null
          benchmark_value: number | null
          created_at: string
          details: Json
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          metric_value: number | null
          period_end: string | null
          period_start: string | null
          portfolio_id: string | null
          previous_value: number | null
          severity: string
          summary: string
          title: string
          type: string
          updated_at: string
          user_id: string
          variation_pct: number | null
        }
        Insert: {
          analyzed_at?: string
          asset_id?: string | null
          benchmark_value?: number | null
          created_at?: string
          details?: Json
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
          portfolio_id?: string | null
          previous_value?: number | null
          severity?: string
          summary: string
          title: string
          type: string
          updated_at?: string
          user_id?: string
          variation_pct?: number | null
        }
        Update: {
          analyzed_at?: string
          asset_id?: string | null
          benchmark_value?: number | null
          created_at?: string
          details?: Json
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
          portfolio_id?: string | null
          previous_value?: number | null
          severity?: string
          summary?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          variation_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_insights_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_insights_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_calculations: {
        Row: {
          admin_fee: number
          annualized_return_pct: number | null
          asset_id: string | null
          compounding: string
          created_at: string
          final_gross_amount: number | null
          final_net_amount: number | null
          id: string
          inflation_rate: number
          initial_amount: number
          inputs: Json
          interest_rate: number
          is_favorite: boolean
          monthly_contribution: number
          notes: string | null
          portfolio_id: string | null
          rate_period: string
          real_return_pct: number | null
          results: Json
          safe_withdrawal_rate: number | null
          target_amount: number | null
          tax_rate: number
          term_unit: string
          term_value: number
          title: string
          total_interest: number | null
          total_invested: number | null
          total_return_pct: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_fee?: number
          annualized_return_pct?: number | null
          asset_id?: string | null
          compounding?: string
          created_at?: string
          final_gross_amount?: number | null
          final_net_amount?: number | null
          id?: string
          inflation_rate?: number
          initial_amount?: number
          inputs?: Json
          interest_rate?: number
          is_favorite?: boolean
          monthly_contribution?: number
          notes?: string | null
          portfolio_id?: string | null
          rate_period?: string
          real_return_pct?: number | null
          results?: Json
          safe_withdrawal_rate?: number | null
          target_amount?: number | null
          tax_rate?: number
          term_unit?: string
          term_value?: number
          title: string
          total_interest?: number | null
          total_invested?: number | null
          total_return_pct?: number | null
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_fee?: number
          annualized_return_pct?: number | null
          asset_id?: string | null
          compounding?: string
          created_at?: string
          final_gross_amount?: number | null
          final_net_amount?: number | null
          id?: string
          inflation_rate?: number
          initial_amount?: number
          inputs?: Json
          interest_rate?: number
          is_favorite?: boolean
          monthly_contribution?: number
          notes?: string | null
          portfolio_id?: string | null
          rate_period?: string
          real_return_pct?: number | null
          results?: Json
          safe_withdrawal_rate?: number | null
          target_amount?: number | null
          tax_rate?: number
          term_unit?: string
          term_value?: number
          title?: string
          total_interest?: number | null
          total_invested?: number | null
          total_return_pct?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_calculations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_calculations_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          alternatives: Json
          asset_id: string | null
          budget_impact_pct: number | null
          context_snapshot: Json
          conversation_id: string | null
          created_at: string
          follow_up_questions: Json
          id: string
          max_recommended_amount: number | null
          portfolio_id: string | null
          portfolio_share_after: number | null
          portfolio_share_before: number | null
          priority: string
          rationale: string
          requested_amount: number | null
          risks: Json
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          alternatives?: Json
          asset_id?: string | null
          budget_impact_pct?: number | null
          context_snapshot?: Json
          conversation_id?: string | null
          created_at?: string
          follow_up_questions?: Json
          id?: string
          max_recommended_amount?: number | null
          portfolio_id?: string | null
          portfolio_share_after?: number | null
          portfolio_share_before?: number | null
          priority?: string
          rationale: string
          requested_amount?: number | null
          risks?: Json
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Update: {
          alternatives?: Json
          asset_id?: string | null
          budget_impact_pct?: number | null
          context_snapshot?: Json
          conversation_id?: string | null
          created_at?: string
          follow_up_questions?: Json
          id?: string
          max_recommended_amount?: number | null
          portfolio_id?: string | null
          portfolio_share_after?: number | null
          portfolio_share_before?: number | null
          priority?: string
          rationale?: string
          requested_amount?: number | null
          risks?: Json
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_profiles: {
        Row: {
          answers: Json
          assessed_at: string
          created_at: string
          emergency_months_target: number
          has_high_interest_debt: boolean
          high_interest_debt_balance: number
          id: string
          investment_horizon: string
          liquidity_preference: string
          max_single_asset_pct: number
          monthly_debt_payment: number
          monthly_expenses: number
          monthly_income: number
          score: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          assessed_at?: string
          created_at?: string
          emergency_months_target?: number
          has_high_interest_debt?: boolean
          high_interest_debt_balance?: number
          id?: string
          investment_horizon?: string
          liquidity_preference?: string
          max_single_asset_pct?: number
          monthly_debt_payment?: number
          monthly_expenses?: number
          monthly_income?: number
          score?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          assessed_at?: string
          created_at?: string
          emergency_months_target?: number
          has_high_interest_debt?: boolean
          high_interest_debt_balance?: number
          id?: string
          investment_horizon?: string
          liquidity_preference?: string
          max_single_asset_pct?: number
          monthly_debt_payment?: number
          monthly_expenses?: number
          monthly_income?: number
          score?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_response_style: string
          concentration_alert_pct: number
          created_at: string
          default_cdi_rate: number
          default_inflation_rate: number
          default_selic_rate: number
          default_swr_rate: number
          default_tax_rate: number
          id: string
          include_financial_context: boolean
          monthly_investment_target: number
          notify_insights: boolean
          notify_rebalancing: boolean
          settings: Json
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_response_style?: string
          concentration_alert_pct?: number
          created_at?: string
          default_cdi_rate?: number
          default_inflation_rate?: number
          default_selic_rate?: number
          default_swr_rate?: number
          default_tax_rate?: number
          id?: string
          include_financial_context?: boolean
          monthly_investment_target?: number
          notify_insights?: boolean
          notify_rebalancing?: boolean
          settings?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_response_style?: string
          concentration_alert_pct?: number
          created_at?: string
          default_cdi_rate?: number
          default_inflation_rate?: number
          default_selic_rate?: number
          default_swr_rate?: number
          default_tax_rate?: number
          id?: string
          include_financial_context?: boolean
          monthly_investment_target?: number
          notify_insights?: boolean
          notify_rebalancing?: boolean
          settings?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_snapshot: { Args: never; Returns: Json }
      decimal_json: { Args: { v: Json }; Returns: Json }
      delete_own_account: { Args: { confirmation: string }; Returns: undefined }
      generate_recurring: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

