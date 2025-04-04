// Basic Deno types
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  export const env: Env;
}

// Module declarations
declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface PostgrestResponse<T = unknown> {
    data: T;
    error: Error | null;
  }

  export interface QueryBuilder<T = unknown> extends PromiseLike<PostgrestResponse<T>> {
    select: <U = T>(columns: string) => QueryBuilder<U>;
    insert: <U = T>(data: object) => QueryBuilder<U>;
    update: <U = T>(data: object) => QueryBuilder<U>;
    delete: <U = T>() => QueryBuilder<U>;
    eq: <U = T>(column: string, value: unknown) => QueryBuilder<U>;
    lte: <U = T>(column: string, value: unknown) => QueryBuilder<U>;
    single: <U = T>() => QueryBuilder<U>;
  }

  // Define the post interface
  export interface ScheduledPost {
    id: string;
    userId: string;
    content: string;
    platform: string;
    scheduledFor: string;
    status: string;
    mediaUrl?: string;
    postId?: string | null;
    error?: string | null;
    [key: string]: unknown;
  }
  
  // Define interfaces for other database tables
  export interface UserAccount {
    access_token: string;
    userId: string;
    provider: string;
  }
  
  export interface Tables {
    ScheduledPost: ScheduledPost;
    accounts: UserAccount;
  }
  
  export interface SupabaseClient {
    from: <T extends keyof Tables>(table: T) => QueryBuilder<Tables[T][]>;
  }
  
  export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient;
} 