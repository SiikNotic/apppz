'use client'

// Sección de campos extendidos de empleado (Problema 8/9), reutilizada
// tanto al crear como al editar — un solo formulario, no dos. Dinámico:
// los campos de conductor (vehículo, placas, licencia) solo aparecen
// cuando el rol elegido es "driver", en vez de un formulario gigante con
// campos irrelevantes para todos.
//
// Los campos de aquí que son sensibles (dirección, contacto de
// emergencia, teléfono secundario, licencia de conducir) solo llegan a
// verse en este formulario porque toda la página /company/team ya está
// gateada por el permiso staff.manage — el mismo que exige el backend
// (RLS) para leer/escribir employee_sensitive_info. No hay una capa de
// UI adicional que ocultar: quien no tiene el permiso ni siquiera entra
// a esta pantalla.
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CompanyRole } from '@/lib/auth/permissions'

export interface EmployeeDetailsValues {
  dateHired: string
  employmentStatus: string
  monthlySalary: string
  storeLocation: string
  internalNotes: string
  residentialStreet: string
  residentialCity: string
  residentialState: string
  residentialZip: string
  secondaryPhone: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  emergencyContactSecondaryName: string
  emergencyContactSecondaryPhone: string
  vehicleType: string
  licensePlate: string
  driversLicenseNumber: string
}

export const EMPTY_EMPLOYEE_DETAILS: EmployeeDetailsValues = {
  dateHired: '',
  employmentStatus: 'active',
  monthlySalary: '',
  storeLocation: '',
  internalNotes: '',
  residentialStreet: '',
  residentialCity: '',
  residentialState: '',
  residentialZip: '',
  secondaryPhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  emergencyContactSecondaryName: '',
  emergencyContactSecondaryPhone: '',
  vehicleType: '',
  licensePlate: '',
  driversLicenseNumber: '',
}

interface EmployeeDetailsFormProps {
  role: CompanyRole
  values: EmployeeDetailsValues
  onChange: (patch: Partial<EmployeeDetailsValues>) => void
}

export function EmployeeDetailsForm({ role, values, onChange }: EmployeeDetailsFormProps) {
  const { t } = useLanguage()
  const EMPLOYMENT_STATUS_OPTIONS = [
    { value: 'active', label: t('employeeForm.statusActive') },
    { value: 'on_leave', label: t('employeeForm.statusOnLeave') },
    { value: 'inactive', label: t('employeeForm.statusInactive') },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{t('employeeForm.employmentHeading')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="emp-hired">{t('employeeForm.dateHired')}</Label>
            <Input
              id="emp-hired"
              type="date"
              value={values.dateHired}
              onChange={(e) => onChange({ dateHired: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('employeeForm.status')}</Label>
            <Select value={values.employmentStatus} onValueChange={(v) => onChange({ employmentStatus: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="emp-salary">{t('teamAdmin.salaryLabel')}</Label>
            <Input
              id="emp-salary"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.monthlySalary}
              onChange={(e) => onChange({ monthlySalary: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="emp-store">{t('employeeForm.storeLocation')}</Label>
            <Input id="emp-store" value={values.storeLocation} onChange={(e) => onChange({ storeLocation: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="emp-notes">{t('employeeForm.internalNotes')}</Label>
            <Textarea
              id="emp-notes"
              rows={2}
              value={values.internalNotes}
              onChange={(e) => onChange({ internalNotes: e.target.value })}
            />
          </div>
        </div>
      </div>

      {role === 'driver' && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{t('employeeForm.driverDataHeading')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="emp-vehicle">{t('employeeForm.vehicleType')}</Label>
              <Input id="emp-vehicle" value={values.vehicleType} onChange={(e) => onChange({ vehicleType: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="emp-plate">{t('employeeForm.licensePlate')}</Label>
              <Input id="emp-plate" value={values.licensePlate} onChange={(e) => onChange({ licensePlate: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="emp-license">{t('employeeForm.driversLicenseNumber')}</Label>
              <Input
                id="emp-license"
                value={values.driversLicenseNumber}
                onChange={(e) => onChange({ driversLicenseNumber: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{t('employeeForm.personalInfoHeading')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="emp-street">{t('employeeForm.address')}</Label>
            <Input id="emp-street" value={values.residentialStreet} onChange={(e) => onChange({ residentialStreet: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-city">{t('account.city')}</Label>
            <Input id="emp-city" value={values.residentialCity} onChange={(e) => onChange({ residentialCity: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-state">{t('account.state')}</Label>
            <Input id="emp-state" value={values.residentialState} onChange={(e) => onChange({ residentialState: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-zip">{t('account.zip')}</Label>
            <Input id="emp-zip" value={values.residentialZip} onChange={(e) => onChange({ residentialZip: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-secphone">{t('employeeForm.secondaryPhoneOptional')}</Label>
            <Input id="emp-secphone" value={values.secondaryPhone} onChange={(e) => onChange({ secondaryPhone: e.target.value })} />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{t('employeeForm.emergencyContactHeading')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="emp-ec-name">{t('menuMgmt.name')}</Label>
            <Input id="emp-ec-name" value={values.emergencyContactName} onChange={(e) => onChange({ emergencyContactName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-ec-rel">{t('employeeForm.relationship')}</Label>
            <Input
              id="emp-ec-rel"
              value={values.emergencyContactRelationship}
              onChange={(e) => onChange({ emergencyContactRelationship: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="emp-ec-phone">{t('auth.phone')}</Label>
            <Input id="emp-ec-phone" value={values.emergencyContactPhone} onChange={(e) => onChange({ emergencyContactPhone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="emp-ec2-name">{t('employeeForm.secondaryContactOptional')}</Label>
            <Input
              id="emp-ec2-name"
              value={values.emergencyContactSecondaryName}
              onChange={(e) => onChange({ emergencyContactSecondaryName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="emp-ec2-phone">{t('employeeForm.secondaryPhoneLabel')}</Label>
            <Input
              id="emp-ec2-phone"
              value={values.emergencyContactSecondaryPhone}
              onChange={(e) => onChange({ emergencyContactSecondaryPhone: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
