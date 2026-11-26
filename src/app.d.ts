declare global {
  namespace App {
    interface Locals {
      admin: { id: string; email: string; role: 'owner' | 'admin' } | null;
    }
  }
}

export {};
