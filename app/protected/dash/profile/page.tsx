'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Mail, Building, Hash, Calendar, FileText, BarChart3, Eye, Download, Edit, Save, X } from 'lucide-react'
import Link from 'next/link'
import jsPDF from 'jspdf'

interface UserProfile {
  name: string
  reg_no: string
  dept: string
  email: string
  created_at: string
}

interface TestAttempt {
  id: string
  test_id: string
  started_at: string
  submitted_at: string
  total_marks: number
  obtained_marks: number
  percentage: number
  total_score: number
  is_completed: boolean
  time_taken_seconds: number
  tests: {
    id: string
    title: string
    duration_minutes: number
  } | null
  responses?: QuestionResponse[]
}

interface QuestionResponse {
  id: string
  question_id: number
  user_answer: string | null
  is_correct: boolean
  marks_obtained: number
  time_spent_seconds: number
}

interface TestReport {
  id: string
  test_title: string
  score: string
  attempted: number
  correct: number
  wrong: number
  time_taken: string
  test_id: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([])
  const [testReports, setTestReports] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    reg_no: '',
    dept: ''
  })
  const [saving, setSaving] = useState(false)

  const extractDepartment = (email: string): string => {
    const emailParts = email.toLowerCase().split('.')
    
    for (let i = 1; i < emailParts.length; i++) {
      const part = emailParts[i]
      const deptPart = part.replace(/[0-9]/g, '')
      
      const deptMap: { [key: string]: string } = {
        'cse': 'CSE',
        'cs': 'CSE',
        'ece': 'ECE',
        'ec': 'ECE',
        'eee': 'EEE',
        'ee': 'EEE',
        'mech': 'MECH',
        'me': 'MECH',
        'civil': 'CIVIL',
        'ce': 'CIVIL',
        'it': 'IT',
        'bmech': 'BMECH',
        'chem': 'CHEM',
        'ch': 'CHEM',
        'aiml': 'AIML',
        'aids': 'AIDS',
        'csbs': 'CSBS',
        'cyber': 'CYBER'
      }
      
      if (deptMap[deptPart]) {
        return deptMap[deptPart]
      }
    }
    
    return 'N/A'
  }

  const handleEdit = () => {
    if (profile) {
      setEditData({
        name: profile.name,
        reg_no: profile.reg_no,
        dept: profile.dept
      })
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData({ name: '', reg_no: '', dept: '' })
  }

  const handleSave = async () => {
    if (!profile) return
    
    try {
      setSaving(true)
      const supabase = createClient()
      
      // Update user metadata with new values
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: editData.name.trim(),
          reg_no: editData.reg_no.trim(),
          display_name: `${editData.name.trim()},${editData.reg_no.trim()}`
        }
      })

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile. Please try again.')
        return
      }

      // Update local profile state
      setProfile({
        ...profile,
        name: editData.name.trim(),
        reg_no: editData.reg_no.trim(),
        dept: editData.dept
      })

      setIsEditing(false)
      alert('Profile updated successfully!')
      
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          console.error('Error fetching user:', error)
          return
        }

        // Extract profile information
        const name = user.user_metadata?.name || user.user_metadata?.full_name || 'N/A'
        const reg_no = user.user_metadata?.reg_no || 'N/A'
        const email = user.email || 'N/A'
        const dept = extractDepartment(email)
        const created_at = user.created_at || new Date().toISOString()

        setProfile({
          name,
          reg_no,
          dept,
          email,
          created_at
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchTestAttempts = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('Error fetching user:', userError)
          return
        }

        // Fetch test attempts with test details
        const { data: attempts, error } = await supabase
          .from('user_test_attempts')
          .select(`
            id,
            test_id,
            started_at,
            submitted_at,
            total_marks,
            obtained_marks,
            percentage,
            total_score,
            is_completed,
            time_taken_seconds
          `)
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('submitted_at', { ascending: false })

        if (error) {
          console.error('Error fetching test attempts:', error)
          setTestAttempts([])
          setTestReports([])
        } else {
          // Generate reports with response data
          const reports: TestReport[] = []
          
          for (const attempt of attempts || []) {
            // Fetch test details separately using test_id
            const { data: testData, error: testError } = await supabase
              .from('tests')
              .select('id, title, duration_minutes')
              .eq('id', attempt.test_id)
              .single()

            if (testError) {
              console.error('Error fetching test details for test_id:', attempt.test_id, testError)
            }

            // Fetch the detailed result using the same API as the result page
            let scoreData = { totalScore: 0, totalPossibleMarks: 0, correctAnswers: 0, incorrectAnswers: 0, answeredQuestions: 0 }
            try {
              const resultResponse = await fetch(`/api/tests/result/${attempt.id}`)
              if (resultResponse.ok) {
                const resultData = await resultResponse.json()
                scoreData = resultData.score
              }
            } catch (error) {
              console.error('Error fetching detailed result for attempt:', attempt.id, error)
            }

            const attempted = scoreData.answeredQuestions || 0
            const correct = scoreData.correctAnswers || 0
            const wrong = scoreData.incorrectAnswers || 0

            reports.push({
              id: attempt.id,
              test_title: testData?.title || `Test ${attempt.test_id}`,
              score: `${scoreData.totalScore}/${scoreData.totalPossibleMarks}`,
              attempted,
              correct,
              wrong,
              time_taken: `${Math.round((attempt.time_taken_seconds || 0) / 60)}m`,
              test_id: attempt.test_id
            })
          }

          setTestReports(reports)
          
          // Also set test attempts for backward compatibility
          const transformedAttempts = (attempts || []).map(attempt => ({
            ...attempt,
            tests: null
          })) as TestAttempt[]
          setTestAttempts(transformedAttempts)
        }
      } catch (error) {
        console.error('Error fetching test attempts:', error)
        setTestAttempts([])
        setTestReports([])
      }
    }

    fetchProfile()
    fetchTestAttempts()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-400 text-center">Unable to load profile information.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const generatePDF = () => {
    if (!profile || testReports.length === 0) return

    // Create new jsPDF instance
    const doc = new jsPDF()
    
    // Set up colors and fonts
    const primaryColor: [number, number, number] = [34, 139, 34] // Green
    const textColor: [number, number, number] = [0, 0, 0] // Black
    const grayColor: [number, number, number] = [128, 128, 128] // Gray
    const highlightColor: [number, number, number] = [255, 215, 0] // Gold for score highlighting
    
    let yPosition = 20
    
    // Title
    doc.setFontSize(20)
    doc.setTextColor(...primaryColor)
    doc.text('Student Test Report', 20, yPosition)
    yPosition += 20
    
    // Student Information Section
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('Student Information', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(11)
    doc.setTextColor(...textColor)
    doc.text(`Name: ${profile.name}`, 20, yPosition)
    yPosition += 7
    doc.text(`Registration Number: ${profile.reg_no}`, 20, yPosition)
    yPosition += 7
    doc.text(`Email: ${profile.email}`, 20, yPosition)
    yPosition += 7
    doc.text(`Department: ${profile.dept}`, 20, yPosition)
    yPosition += 20
    
    // Test Results Section
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('Test Results Summary', 20, yPosition)
    yPosition += 15
    
    // Table setup with better alignment
    doc.setFontSize(9)
    doc.setTextColor(...textColor)
    const headers = ['S.No', 'Test Name', 'Attempted', 'Correct', 'Wrong', 'Time', 'Score', 'Percentage']
    const colWidths = [12, 55, 18, 16, 16, 18, 22, 20]
    const colPositions = [20, 32, 87, 105, 121, 137, 155, 177]
    const tableWidth = 177
    
    // Draw header row with background
    doc.setFillColor(220, 220, 220)
    doc.rect(20, yPosition - 6, tableWidth, 10, 'F')
    doc.setDrawColor(100, 100, 100)
    doc.rect(20, yPosition - 6, tableWidth, 10, 'S')
    
    // Draw header text
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], yPosition)
    })
    yPosition += 10
    
    // Table data with proper alignment
    doc.setFont('helvetica', 'normal')
    testReports.forEach((report, index) => {
      if (yPosition > 260) { // Check if we need a new page
        doc.addPage()
        yPosition = 20
        
        // Redraw header on new page
        doc.setFillColor(220, 220, 220)
        doc.rect(20, yPosition - 6, tableWidth, 10, 'F')
        doc.setDrawColor(100, 100, 100)
        doc.rect(20, yPosition - 6, tableWidth, 10, 'S')
        
        doc.setFont('helvetica', 'bold')
        headers.forEach((header, idx) => {
          doc.text(header, colPositions[idx], yPosition)
        })
        yPosition += 10
        doc.setFont('helvetica', 'normal')
      }
      
      const [obtained, total] = report.score.split('/').map(s => parseFloat(s) || 0)
      const percentage = total > 0 ? ((obtained / total) * 100).toFixed(1) : '0.0'
      
      // Alternate row colors
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 248)
        doc.rect(20, yPosition - 6, tableWidth, 8, 'F')
      }
      
      // Highlight score column
      doc.setFillColor(...highlightColor)
      doc.rect(colPositions[6] - 1, yPosition - 6, colWidths[6] + 2, 8, 'F')
      
      // Draw row border
      doc.setDrawColor(200, 200, 200)
      doc.rect(20, yPosition - 6, tableWidth, 8, 'S')
      
      const rowData = [
        (index + 1).toString(),
        report.test_title.length > 20 ? report.test_title.substring(0, 17) + '...' : report.test_title,
        report.attempted.toString(),
        report.correct.toString(),
        report.wrong.toString(),
        report.time_taken,
        report.score,
        `${percentage}%`
      ]
      
      // Center-align numeric data and left-align text
      rowData.forEach((data, colIndex) => {
        let xPos = colPositions[colIndex]
        
        // Center numeric columns
        if ([0, 2, 3, 4, 7].includes(colIndex)) {
          const textWidth = doc.getTextWidth(data)
          xPos = colPositions[colIndex] + (colWidths[colIndex] - textWidth) / 2
        }
        
        // Highlight score text
        if (colIndex === 6) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...primaryColor)
          const textWidth = doc.getTextWidth(data)
          xPos = colPositions[colIndex] + (colWidths[colIndex] - textWidth) / 2
        } else {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...textColor)
        }
        
        doc.text(data, xPos, yPosition)
      })
      yPosition += 8
    })
    
    yPosition += 15
    
    // Summary Statistics
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('Summary Statistics', 20, yPosition)
    yPosition += 15
    
    doc.setFontSize(11)
    doc.setTextColor(...textColor)
    doc.setFont('helvetica', 'normal')
    
    const totalAttempted = testReports.reduce((sum, report) => sum + report.attempted, 0)
    const totalCorrect = testReports.reduce((sum, report) => sum + report.correct, 0)
    const totalWrong = testReports.reduce((sum, report) => sum + report.wrong, 0)
    const overallAccuracy = totalAttempted > 0 ? ((totalCorrect / totalAttempted) * 100).toFixed(1) : '0.0'
    
    doc.text(`Total Tests Completed: ${testReports.length}`, 20, yPosition)
    yPosition += 7
    doc.text(`Total Questions Attempted: ${totalAttempted}`, 20, yPosition)
    yPosition += 7
    doc.text(`Total Correct Answers: ${totalCorrect}`, 20, yPosition)
    yPosition += 7
    doc.text(`Total Wrong Answers: ${totalWrong}`, 20, yPosition)
    yPosition += 7
    doc.text(`Overall Accuracy: ${overallAccuracy}%`, 20, yPosition)
    
    // Page numbering (without generation date on each page)
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...grayColor)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }
    
    // Add generation date only on the last page
    doc.setPage(pageCount)
    doc.setFontSize(8)
    doc.setTextColor(...grayColor)
    doc.text(`Report generated on ${new Date().toLocaleString()}`, 20, 290)
    
    // Save the PDF
    const fileName = `${profile.name.replace(/\s+/g, '_')}_Test_Report_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account and view your academic progress</p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-500" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and academic information
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEdit}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="font-medium"
                    />
                  ) : (
                    <p className="font-medium">{profile.name}</p>
                  )}
                </div>
              </div>

              {/* Registration Number */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-shrink-0">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Registration Number</p>
                  {isEditing ? (
                    <Input
                      value={editData.reg_no}
                      onChange={(e) => setEditData({ ...editData, reg_no: e.target.value })}
                      placeholder="Enter your registration number"
                      className="font-medium"
                    />
                  ) : (
                    <p className="font-medium">{profile.reg_no}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-shrink-0">
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  {isEditing ? (
                    <select
                      value={editData.dept}
                      onChange={(e) => setEditData({ ...editData, dept: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                    >
                      <option value="">Select Department</option>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                      <option value="IT">IT</option>
                      <option value="BMECH">BMECH</option>
                      <option value="CHEM">CHEM</option>
                      <option value="AIML">AIML</option>
                      <option value="AIDS">AIDS</option>
                      <option value="CSBS">CSBS</option>
                      <option value="CYBER">CYBER</option>
                    </select>
                  ) : (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
                      {profile.dept}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>

              {/* Account Created */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Account Created</p>
                  <p className="font-medium">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading reports...</span>
                </div>
              </CardContent>
            </Card>
          ) : testReports.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Test Reports
                </CardTitle>
                <CardDescription>
                  View your test reports and detailed performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Reports Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Your test reports will appear here once you complete tests.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      Test Reports ({testReports.length} completed)
                    </CardTitle>
                    <CardDescription>
                      Detailed performance reports for all your completed tests
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={generatePDF} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testReports.map((report, index) => (
                    <Card key={report.id} className="border border-border">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {report.test_title}
                            </h3>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/protected/test-result/${report.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold text-foreground">
                              {report.score}
                            </div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                          
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {report.attempted}
                            </div>
                            <div className="text-xs text-muted-foreground">Attempted</div>
                          </div>
                          
                          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {report.correct}
                            </div>
                            <div className="text-xs text-muted-foreground">Correct</div>
                          </div>
                          
                          <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                            <div className="text-lg font-bold text-red-600">
                              {report.wrong}
                            </div>
                            <div className="text-xs text-muted-foreground">Wrong</div>
                          </div>
                          
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {report.time_taken}
                            </div>
                            <div className="text-xs text-muted-foreground">Time Taken</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
