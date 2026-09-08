import { test, expect } from '@playwright/test'

// Estas páginas son estáticas (no dependen de datos de Supabase), así que
// sirven como humo rápido de que el router y el layout base funcionan.

test.describe('Páginas legales y de ayuda', () => {
  test('/terms muestra el título y enlaza a /privacy', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Términos de servicio' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacy'
    )
  })

  test('/privacy muestra el título', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible()
  })

  test('/accessibility muestra el título', async ({ page }) => {
    await page.goto('/accessibility')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('/help muestra el título', async ({ page }) => {
    await page.goto('/help')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('404', () => {
  test('una ruta inexistente muestra la página not-found', async ({ page }) => {
    const response = await page.goto('/esto-no-existe-nunca')
    expect(response?.status()).toBe(404)
  })
})
