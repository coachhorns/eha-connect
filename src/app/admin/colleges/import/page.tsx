'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { Button, Card } from '@/components/ui'

interface ImportResult {
  success: boolean
  collegesCreated: number
  collegesUpdated: number
  coachesCreated: number
  skipped: number
  totalRows: number
}

export default function CollegeImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  if (status === 'loading' || (session?.user.role !== 'ADMIN')) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError('')
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setResult(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/colleges/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
        return
      }

      setResult(data)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import file. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary uppercase tracking-wider">
            Import College Data
          </h1>
          <p className="mt-2 text-text-muted">
            Upload CSV files (d1.csv, d2.csv, etc.) to populate the college recruiting database
          </p>
        </div>
      </div>

      {/* Import Card */}
      <Card className="max-w-2xl">
        <div className="space-y-6">
          {/* Instructions */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">CSV Format</h2>
            <p className="text-text-muted text-sm mb-2">
              Your CSV should include these column headers:
            </p>
            <div className="bg-page-bg rounded-lg p-4 font-mono text-xs text-text-secondary">
              School, Division, Conference, City, State, Region, First name, Last name, Position, Email address
            </div>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Select CSV File
            </label>
            <div className="border-2 border-dashed border-border-default rounded-xl p-6 text-center hover:border-white/30 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-[#E31837]" />
                    <div className="text-left">
                      <p className="text-text-primary font-medium">{file.name}</p>
                      <p className="text-text-muted text-sm">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                    <p className="text-text-primary font-medium mb-1">
                      Click to select a CSV file
                    </p>
                    <p className="text-text-muted text-sm">
                      Supports .csv files only
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || isImporting}
            isLoading={isImporting}
            className="w-full"
          >
            {isImporting ? 'Importing...' : 'Import Coaches'}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-300 font-medium">Import Complete</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-text-muted">Total Rows:</div>
                <div className="text-text-primary">{result.totalRows}</div>
                <div className="text-text-muted">Colleges Created:</div>
                <div className="text-text-primary">{result.collegesCreated}</div>
                <div className="text-text-muted">Colleges Updated:</div>
                <div className="text-text-primary">{result.collegesUpdated}</div>
                <div className="text-text-muted">Coaches Created:</div>
                <div className="text-text-primary">{result.coachesCreated}</div>
                {result.skipped > 0 && (
                  <>
                    <div className="text-text-muted">Skipped:</div>
                    <div className="text-yellow-400">{result.skipped}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
