import { test, expect } from '@playwright/test'

test.describe('Login de cliente', () => {
  test('valida el formulario en el cliente antes de llamar al servidor', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar' }).click()
    // No debe navegar ni intentar iniciar sesión con campos vacíos.
    await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('credenciales inválidas muestran un mensaje genérico, nunca detalles', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill('no-existe-este-correo@example.com')
    await page.getByLabel('Contraseña').fill('ContraseñaFalsa123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    const error = page.getByRole('alert').filter({ hasText: /correo o contraseña/i })
    await expect(error).toBeVisible({ timeout: 15_000 })
    // El mensaje nunca debe insinuar si la cuenta existe o no.
    await expect(error).not.toContainText(/no existe|not found|usuario no encontrado/i)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('enlaza a registro y a recuperar contraseña', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
    await expect(page.getByRole('link', { name: '¿La olvidaste?' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })
})

test.describe('Registro de cliente', () => {
  test('valida contraseñas débiles y no coincidentes antes de enviar', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Nombre completo').fill('Ana Pérez')
    await page.getByLabel('Correo').fill('ana@example.com')
    await page.getByLabel('Teléfono').fill('5555555555')
    await page.getByLabel('Contraseña', { exact: true }).fill('abc')
    await page.getByLabel('Confirmar contraseña').fill('xyz')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    // Debe seguir en /register: la validación de zod detiene el envío.
    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('alert').first()).toBeVisible()
  })
})

test.describe('Login de compañía vs. login de cliente', () => {
  test('el login de compañía es una experiencia separada, sin registro público', async ({ page }) => {
    await page.goto('/company/login')
    await expect(page.getByText('Company dashboard')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0)
    await expect(page.getByText(/las cuentas de staff las crea un administrador/i)).toBeVisible()
  })

  test('credenciales inválidas en compañía también dan un mensaje genérico', async ({ page }) => {
    await page.goto('/company/login')
    await page.getByLabel('Correo').fill('no-staff@example.com')
    await page.getByLabel('Contraseña').fill('ContraseñaFalsa123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    const error = page.getByRole('alert').filter({ hasText: /correo o contraseña|no tiene acceso/i })
    await expect(error).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/company\/login$/)
  })
})
