import { useState, useEffect } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { CardSkeleton } from '../components/Skeleton'

interface Certification {
  name: string
  issuer: string
  issue_date?: string
  credential_id?: string
  credential_url?: string
}

interface StudentProfileData {
  id: string
  user_id: string
  name: string
  email: string
  mobile: string
  dob: string
  gender: string
  address: string
  portfolio_url: string
  github_url: string
  linkedin_url: string
  resume_path: string | null
  profile_picture: string | null
  skills: string[]
  degree: string
  branch: string
  semester: string
  cgpa: number | null
  graduation_year: number | null
  certifications: Certification[]
  institute_id: string | null
  institute_name: string
  mentor_name: string | null
  mentor_email: string | null
  mentor_department: string | null
  profile_completion: number
}

export default function StudentProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [profile, setProfile] = useState<StudentProfileData | null>(null)
  const [editForm, setEditForm] = useState<Partial<StudentProfileData>>({})
  const [isEditing, setIsEditing] = useState(false)

  // Skill input
  const [newSkill, setNewSkill] = useState('')

  // Certification input
  const [showCertModal, setShowCertModal] = useState(false)
  const [certForm, setCertForm] = useState<Certification>({
    name: '',
    issuer: '',
    issue_date: '',
    credential_id: '',
    credential_url: ''
  })

  const token = localStorage.getItem('token')

  const fetchProfile = async () => {
    if (!token) {
      navigate('/login?role=student')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('http://localhost:8000/api/students/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401 || res.status === 403) {
        localStorage.clear()
        navigate('/login?role=student')
        return
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to load student profile.')
      }
      const data: StudentProfileData = await res.json()
      setProfile(data)
      setEditForm(data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSaveProfile = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!profile) return

    setSaving(true)
    setErrorMsg('')
    try {
      // Validate CGPA if given
      if (editForm.cgpa !== null && editForm.cgpa !== undefined) {
        const numCgpa = Number(editForm.cgpa)
        if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
          throw new Error('Please enter a valid CGPA between 0.0 and 10.0.')
        }
      }

      const res = await fetch('http://localhost:8000/api/students/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name || profile.name,
          mobile: editForm.mobile,
          dob: editForm.dob,
          gender: editForm.gender,
          address: editForm.address,
          portfolio_url: editForm.portfolio_url,
          github_url: editForm.github_url,
          linkedin_url: editForm.linkedin_url,
          skills: editForm.skills || profile.skills,
          degree: editForm.degree || profile.degree,
          branch: editForm.branch || profile.branch,
          semester: editForm.semester || profile.semester,
          cgpa: editForm.cgpa !== null && editForm.cgpa !== undefined ? Number(editForm.cgpa) : null,
          graduation_year: editForm.graduation_year ? Number(editForm.graduation_year) : 2025,
          certifications: editForm.certifications || profile.certifications,
          institute_id: profile.institute_id
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to update profile.')

      setSaveSuccess(true)
      setIsEditing(false)
      await fetchProfile()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSkill = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newSkill.trim()
    if (!trimmed || !profile) return

    const currentSkills = editForm.skills || profile.skills || []
    const exists = currentSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setNewSkill('')
      return
    }

    const updatedSkills = [...currentSkills, trimmed]
    setEditForm(prev => ({ ...prev, skills: updatedSkills }))
    setProfile(prev => prev ? { ...prev, skills: updatedSkills } : null)
    setNewSkill('')

    // Save immediately to backend
    try {
      await fetch('http://localhost:8000/api/students/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          mobile: profile.mobile,
          dob: profile.dob,
          gender: profile.gender,
          address: profile.address,
          portfolio_url: profile.portfolio_url,
          github_url: profile.github_url,
          linkedin_url: profile.linkedin_url,
          skills: updatedSkills,
          degree: profile.degree,
          branch: profile.branch,
          semester: profile.semester,
          cgpa: profile.cgpa,
          graduation_year: profile.graduation_year,
          certifications: profile.certifications
        })
      })
    } catch {}
  }

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!profile) return
    const updatedSkills = (profile.skills || []).filter(s => s !== skillToRemove)
    setProfile(prev => prev ? { ...prev, skills: updatedSkills } : null)
    setEditForm(prev => ({ ...prev, skills: updatedSkills }))

    try {
      await fetch('http://localhost:8000/api/students/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          mobile: profile.mobile,
          skills: updatedSkills,
          degree: profile.degree,
          branch: profile.branch,
          semester: profile.semester,
          cgpa: profile.cgpa,
          graduation_year: profile.graduation_year,
          certifications: profile.certifications
        })
      })
    } catch {}
  }

  const handleAddCertification = async (e: FormEvent) => {
    e.preventDefault()
    if (!certForm.name.trim() || !certForm.issuer.trim() || !profile) return

    const updatedCerts = [...(profile.certifications || []), certForm]
    setProfile(prev => prev ? { ...prev, certifications: updatedCerts } : null)
    setEditForm(prev => ({ ...prev, certifications: updatedCerts }))
    setShowCertModal(false)
    setCertForm({ name: '', issuer: '', issue_date: '', credential_id: '', credential_url: '' })

    try {
      await fetch('http://localhost:8000/api/students/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          mobile: profile.mobile,
          skills: profile.skills,
          degree: profile.degree,
          branch: profile.branch,
          semester: profile.semester,
          cgpa: profile.cgpa,
          graduation_year: profile.graduation_year,
          certifications: updatedCerts
        })
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {}
  }

  const handleRemoveCertification = async (index: number) => {
    if (!profile) return
    const updatedCerts = (profile.certifications || []).filter((_, i) => i !== index)
    setProfile(prev => prev ? { ...prev, certifications: updatedCerts } : null)
    setEditForm(prev => ({ ...prev, certifications: updatedCerts }))

    try {
      await fetch('http://localhost:8000/api/students/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          mobile: profile.mobile,
          skills: profile.skills,
          degree: profile.degree,
          branch: profile.branch,
          semester: profile.semester,
          cgpa: profile.cgpa,
          graduation_year: profile.graduation_year,
          certifications: updatedCerts
        })
      })
    } catch {}
  }

  const handleResumeUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setErrorMsg('Only PDF and DOCX resume files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit.')
      return
    }

    setUploadingResume(true)
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:8000/api/students/profile/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to upload resume.')

      setSaveSuccess(true)
      await fetchProfile()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading resume.')
    } finally {
      setUploadingResume(false)
    }
  }

  const handleProfilePictureUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, WebP and GIF images are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit.')
      return
    }

    setUploadingPicture(true)
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:8000/api/students/profile/picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to upload profile picture.')

      setSaveSuccess(true)
      await fetchProfile()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading profile picture.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleDeleteProfilePicture = async () => {
    if (!profile?.profile_picture) return
    setErrorMsg('')
    try {
      const res = await fetch('http://localhost:8000/api/students/profile/picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to remove profile picture.')
      }
      await fetchProfile()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing profile picture.')
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
        <Navbar role="student" activeTab="My Profile" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CardSkeleton />
            <div className="md:col-span-2">
              <CardSkeleton />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
        <Navbar role="student" activeTab="My Profile" />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <div className="text-red-500 text-3xl">⚠️</div>
          <p className="text-sm text-red-600 font-bold">{errorMsg || 'Unable to load profile.'}</p>
          <button onClick={() => navigate('/login?role=student')} className="btn-primary text-xs py-2 px-4">
            Sign In Again
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  const resumeFilename = profile.resume_path ? profile.resume_path.split('/').pop()?.split('\\').pop()?.replace(/^[a-f0-9-]+_/, '') : null
  const resumeUrl = profile.resume_path ? `http://localhost:8000/${profile.resume_path.replace(/^\.\//, '')}` : null

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="My Profile" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Global Notifications / Errors */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-700">✕</button>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>Profile successfully updated!</span>
          </div>
        )}

        {/* Top Profile Header Card */}
        <div className="card shadow-card">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-5">
              <div className="relative group">
                {profile.profile_picture ? (
                  <img
                    src={`http://localhost:8000/${profile.profile_picture.replace(/^\.\//, '')}`}
                    alt={profile.name}
                    className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#4B1881] to-[#321153] text-white flex items-center justify-center text-3xl font-black shadow-md border-2 border-white">
                    {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingPicture}
                    className="hidden"
                  />
                  <span className="text-white text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">{uploadingPicture ? 'hourglass_top' : 'photo_camera'}</span>
                    {uploadingPicture ? 'Uploading...' : 'Change Photo'}
                  </span>
                </label>
                {profile.profile_picture && (
                  <button
                    onClick={handleDeleteProfilePicture}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div>
                <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
                  {profile.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#F26522]">school</span>
                    {profile.degree} in {profile.branch}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#4B1881]">apartment</span>
                    {profile.institute_name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    Class of {profile.graduation_year || 2025}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-orange text-xs px-3 py-1 font-bold">
                    {profile.cgpa ? `CGPA: ${profile.cgpa.toFixed(2)}/10.0` : 'CGPA: Pending'}
                  </span>
                  <span className="text-[11px] font-bold text-[#4B1881] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    Profile {profile.profile_completion}% Complete
                  </span>
                  {(profile as any).approval_status === 'APPROVED' ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      TPO Verified
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
                      Pending TPO Verification
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate('/my-applications')}
                className="btn-secondary flex-1 md:flex-initial text-xs py-2.5"
              >
                <span className="material-symbols-outlined text-sm">checklist_rtl</span>
                My Applications
              </button>
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSaveProfile()
                  } else {
                    setIsEditing(true)
                  }
                }}
                disabled={saving}
                className="btn-purple flex-1 md:flex-initial text-xs py-2.5 shadow-none"
              >
                <span className="material-symbols-outlined text-sm">{isEditing ? 'save' : 'edit'}</span>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Details'}
              </button>
            </div>

          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Personal Info & Skills */}
          <div className="space-y-8">
            
            {/* Personal Info Card */}
            <div className="card">
              <h2 className="font-headline font-bold text-base text-[#0F172A] mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4B1881] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                Personal Details
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-500 font-medium block mb-1">Email ID</label>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="material-symbols-outlined text-slate-400 text-sm">mail</span>
                    <span>{profile.email}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-medium block mb-1">Mobile Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      maxLength={10}
                      value={editForm.mobile || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                      placeholder="10-digit mobile number"
                      className="input-field text-xs"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">phone</span>
                      <span>{profile.mobile ? `+91 ${profile.mobile}` : 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 font-medium block mb-1">Location / Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.address || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g. Pune, Maharashtra"
                      className="input-field text-xs"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <span className="material-symbols-outlined text-[#4B1881] text-sm">location_on</span>
                      <span>{profile.address || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="text-slate-500 font-medium block mb-2">Web &amp; Profiles</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={editForm.github_url || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, github_url: e.target.value }))}
                        placeholder="GitHub URL"
                        className="input-field text-xs"
                      />
                      <input
                        type="url"
                        value={editForm.linkedin_url || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                        placeholder="LinkedIn URL"
                        className="input-field text-xs"
                      />
                      <input
                        type="url"
                        value={editForm.portfolio_url || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, portfolio_url: e.target.value }))}
                        placeholder="Portfolio Website URL"
                        className="input-field text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {profile.linkedin_url ? (
                        <a
                          href={profile.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center font-bold text-xs transition-colors"
                          title="LinkedIn"
                        >
                          in
                        </a>
                      ) : null}
                      {profile.github_url ? (
                        <a
                          href={profile.github_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold text-xs transition-colors"
                          title="GitHub"
                        >
                          gh
                        </a>
                      ) : null}
                      {profile.portfolio_url ? (
                        <a
                          href={profile.portfolio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-orange-50 text-[#F26522] hover:bg-orange-100 flex items-center justify-center font-bold text-xs transition-colors"
                          title="Portfolio"
                        >
                          <span className="material-symbols-outlined text-sm">language</span>
                        </a>
                      ) : null}
                      {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && (
                        <span className="text-slate-400 italic">No links added</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Skills Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#F26522] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>code</span>
                  Technical Skills ({profile.skills?.length || 0})
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#FFF4EC] text-[#C2410C] border border-orange-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-orange-400 hover:text-orange-700 text-xs font-bold leading-none"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No skills listed yet. Add skills below or upload your resume.</p>
                )}
              </div>

              <form onSubmit={handleAddSkill} className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  placeholder="Add skill (e.g. React.js, Docker)..."
                  className="input-field py-1.5 text-xs flex-1"
                />
                <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                  <span className="material-symbols-outlined text-xs">add</span>
                  Add
                </button>
              </form>
            </div>

          </div>

          {/* Right 2 Columns: Academic, Certifications & Resume Management */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Academic Details Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4B1881] text-xl">school</span>
                  Academic Profile
                </h2>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">College / Institute Name</label>
                    <input
                      type="text"
                      value={editForm.institute_name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, institute_name: e.target.value }))}
                      placeholder="e.g. GHRCE Nagpur / Raisoni Group"
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Degree</label>
                    <input
                      type="text"
                      value={editForm.degree || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, degree: e.target.value }))}
                      placeholder="e.g. B.Tech"
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Branch / Department</label>
                    <select
                      value={editForm.branch || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, branch: e.target.value }))}
                      className="input-field text-xs bg-white"
                    >
                      <option value="">Select Branch</option>
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Mechatronics Engineering">Mechatronics Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="Cyber Security">Cyber Security</option>
                      <option value="Biotechnology">Biotechnology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Semester / Year</label>
                    <input
                      type="text"
                      value={editForm.semester || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, semester: e.target.value }))}
                      placeholder="e.g. Semester 7 / Year 4"
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CGPA (out of 10.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={editForm.cgpa ?? ''}
                      onChange={e => setEditForm(prev => ({ ...prev, cgpa: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="e.g. 8.75"
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Graduation Year</label>
                    <input
                      type="number"
                      value={editForm.graduation_year || 2025}
                      onChange={e => setEditForm(prev => ({ ...prev, graduation_year: parseInt(e.target.value) || 2025 }))}
                      className="input-field text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#0F172A]">
                        {profile.degree} in {profile.branch}
                      </h3>
                      <p className="text-xs font-semibold text-[#4B1881] mt-0.5">{profile.institute_name}</p>
                      <p className="text-xs text-slate-600 mt-2">
                        {profile.semester} • Current CGPA: <strong className="text-slate-900">{profile.cgpa !== null ? profile.cgpa.toFixed(2) : 'Not specified'} / 10.0</strong>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                      Class of {profile.graduation_year || 2025}
                    </span>
                  </div>

                  {profile.mentor_name && (
                    <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Assigned Faculty Mentor</span>
                        <span className="font-bold text-[#4B1881] text-sm">{profile.mentor_name}</span>
                        {profile.mentor_department && (
                          <span className="text-slate-600 block text-[11px]">{profile.mentor_department}</span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate('/mentor')}
                        className="btn-secondary text-xs py-1.5 px-3 bg-white"
                      >
                        Contact Mentor
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Certifications Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#F26522] text-xl">workspace_premium</span>
                  Certifications ({profile.certifications?.length || 0})
                </h2>
                <button
                  onClick={() => setShowCertModal(true)}
                  className="text-xs text-[#4B1881] font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Add Certification
                </button>
              </div>

              {profile.certifications && profile.certifications.length > 0 ? (
                <div className="space-y-3">
                  {profile.certifications.map((cert, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-[#0F172A]">{cert.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {cert.issuer} {cert.issue_date ? `• Issued ${cert.issue_date}` : ''}
                        </p>
                        {cert.credential_id && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {cert.credential_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveCertification(idx)}
                          className="text-slate-400 hover:text-red-600"
                          title="Delete certification"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No certifications added yet.</p>
              )}
            </div>

            {/* Resume Management Card */}
            <div className="card">
              <h2 className="font-headline font-bold text-base text-[#0F172A] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F26522] text-xl">description</span>
                Resume Management
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Current Active Resume */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                      Current Active Resume
                    </span>
                    {resumeFilename ? (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm mb-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#0F172A] truncate" title={resumeFilename}>
                            {resumeFilename}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-bold">
                            ✓ Ready for AI ATS Screening
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4 text-xs text-amber-800">
                        ⚠️ No active resume uploaded yet. Please upload your PDF or DOCX file to enable real ATS scoring.
                      </div>
                    )}
                  </div>

                  {resumeUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-xs py-2 flex-1 justify-center"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Resume
                      </a>
                    </div>
                  )}
                </div>

                {/* Upload New Resume */}
                <label className="border-2 border-dashed border-orange-300 hover:border-[#F26522] bg-[#FFF4EC]/50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#F26522] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">
                      {uploadingResume ? 'hourglass_top' : 'upload_file'}
                    </span>
                  </div>
                  <h4 className="font-headline text-xs font-bold text-[#0F172A] mb-1">
                    {uploadingResume ? 'Reading & Analyzing Resume...' : 'Upload New Resume'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Drag and drop file here, or click to browse.
                  </p>
                  <span className="text-[10px] text-[#C2410C] font-semibold">
                    Supported formats: PDF, DOCX (Max 5MB)
                  </span>
                </label>

              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Add Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#0F172A]">Add New Certification</h3>
              <button onClick={() => setShowCertModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddCertification} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Certification Name</label>
                <input
                  type="text"
                  required
                  value={certForm.name}
                  onChange={e => setCertForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issuing Organization</label>
                <input
                  type="text"
                  required
                  value={certForm.issuer}
                  onChange={e => setCertForm(prev => ({ ...prev, issuer: e.target.value }))}
                  placeholder="e.g. Amazon Web Services, Coursera, Oracle"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={certForm.issue_date}
                  onChange={e => setCertForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Credential ID (Optional)</label>
                <input
                  type="text"
                  value={certForm.credential_id}
                  onChange={e => setCertForm(prev => ({ ...prev, credential_id: e.target.value }))}
                  placeholder="e.g. AWS-123456"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification URL (Optional)</label>
                <input
                  type="url"
                  value={certForm.credential_url}
                  onChange={e => setCertForm(prev => ({ ...prev, credential_url: e.target.value }))}
                  placeholder="https://..."
                  className="input-field text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="btn-secondary flex-1 justify-center py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center py-2">
                  Save Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
