export interface ProductData {
  name: string
  brand: string
  device: string
  capacity: string
  phaseR: string
  phaseS: string
  phaseT: string
  phaseNG?: string
  voltage: string
  grounding: string
  ups: string
  stabilizer: string
  powerProtection: string
  communicationProtection: string
  load: string
  note: string
  photos: string[]
  measurementPhotos: string[]
  solutionTitle?: string
  ets?: string
  covered?: string
  photoLayoutMode?: '1row' | '2rows'
  phaseDisplayMode?: 'separated' | 'unified'
}

export interface ReportData {
  reportType: 'survey' | 'final'
  clientName: string
  clientLogo: string
  address: string
  surveyDate: string
  surveyLocation: string
  coverTitle: string
  coverSubtitle: string
  findings: string[]
  requiredSolution: string[]
  explanation: string
  products: ProductData[]
}
