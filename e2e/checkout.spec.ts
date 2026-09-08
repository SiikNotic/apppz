import { test, expect } from '@playwright/test'

test.describe('Checkout con carrito vacío', () => {
  test('nunca deja pagar un carrito vacío: muestra el estado vacío y lleva al menú', async ({
    page,
  }) => {
    await page.goto('/checkout')
    await expect(page.getByText('Tu carrito está vacío.')).toBeVisible()

    await page.getByRole('button', { name: 'Ver el menú' }).click()
    await expect(page).toHaveURL(/\/menu$/)
  })
})
