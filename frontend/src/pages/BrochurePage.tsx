import { useState, useRef } from 'react'
import { Card, CardContent } from '../components/ui/card'

interface SectionStyle {
  fontSize: string
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
}

interface Section {
  id: string
  title: string
  content: string
  style: SectionStyle
  image: string | null
}

export default function BrochurePage() {
  const initialSections: Section[] = [
    {
      id: 'cover',
      title: 'Cover Page',
      content: 'Add your title here',
      style: { 
        fontSize: '24px', 
        textAlign: 'center',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      },
      image: null
    },
    {
      id: 'introduction',
      title: 'Introduction',
      content: 'Write your introduction here',
      style: { 
        fontSize: '16px',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      },
      image: null
    },
    {
      id: 'main-content',
      title: 'Main Content',
      content: 'Add your main content',
      style: { 
        fontSize: '16px',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      },
      image: null
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: 'Add your contact details',
      style: { 
        fontSize: '14px',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
      },
      image: null
    }
  ]

  const [sections, setSections] = useState(initialSections)
  const [activeSection, setActiveSection] = useState('cover')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleContentChange = (sectionId: string, content: string) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, content } : section
    ))
  }

  type StyleValue<T extends keyof SectionStyle> = NonNullable<SectionStyle[T]>

  const handleStyleChange = <T extends keyof SectionStyle>(
    sectionId: string,
    styleProperty: T,
    value: StyleValue<T>
  ) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, style: { ...section.style, [styleProperty]: value } }
        : section
    ))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSections(sections.map(section =>
          section.id === activeSection
            ? { ...section, image: e.target?.result as string }
            : section
        ))
      }
      reader.readAsDataURL(file)
    }
  }

  const addNewSection = () => {
    const newSection = {
      id: `section-${sections.length + 1}`,
      title: `New Section ${sections.length + 1}`,
      content: 'Add your content here',
      style: { 
        fontSize: '16px',
        textAlign: 'left' as const,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecoration: 'none' as const
      },
      image: null
    }
    setSections([...sections, newSection])
  }

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      const newSections = sections.filter(section => section.id !== sectionId)
      setSections(newSections)
      if (activeSection === sectionId) {
        setActiveSection(newSections[0].id)
      }
    }
  }

  const TextEditor = ({ section }: { section: typeof sections[0] }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <button
          onClick={() => handleStyleChange(section.id, 'fontWeight',
            section.style.fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
            section.style.fontWeight === 'bold' ? 'bg-slate-200' : ''
          }`}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          onClick={() => handleStyleChange(section.id, 'fontStyle',
            section.style.fontStyle === 'italic' ? 'normal' : 'italic')}
          className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
            section.style.fontStyle === 'italic' ? 'bg-slate-200' : ''
          }`}
          title="Italic"
        >
          <span className="italic">I</span>
        </button>
        <button
          onClick={() => handleStyleChange(section.id, 'textDecoration',
            section.style.textDecoration === 'underline' ? 'none' : 'underline')}
          className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
            section.style.textDecoration === 'underline' ? 'bg-slate-200' : ''
          }`}
          title="Underline"
        >
          <span className="underline">U</span>
        </button>
        <select
          value={section.style.fontSize || '16px'}
          onChange={(e) => handleStyleChange(section.id, 'fontSize', e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white shadow-sm hover:border-blue-400 transition-colors"
        >
          {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => handleStyleChange(section.id, 'textAlign', 'left' as const)}
            className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
              section.style.textAlign === 'left' ? 'bg-slate-200' : ''
            }`}
            title="Align Left"
          >
            ←
          </button>
          <button
            onClick={() => handleStyleChange(section.id, 'textAlign', 'center' as const)}
            className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
              section.style.textAlign === 'center' ? 'bg-slate-200' : ''
            }`}
            title="Align Center"
          >
            ↔
          </button>
          <button
            onClick={() => handleStyleChange(section.id, 'textAlign', 'right' as const)}
            className={`p-2.5 rounded-lg hover:bg-slate-200 transition-colors ${
              section.style.textAlign === 'right' ? 'bg-slate-200' : ''
            }`}
            title="Align Right"
          >
            →
          </button>
        </div>
      </div>

      <textarea
        value={section.content}
        onChange={(e) => handleContentChange(section.id, e.target.value)}
        className="w-full h-48 p-4 border rounded-lg shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
        style={section.style as React.CSSProperties}
      />

      {section.image && (
        <div className="relative rounded-lg overflow-hidden shadow-md">
          <img
            src={section.image}
            alt="Section image"
            className="max-w-full h-auto"
          />
          <button
            onClick={() => setSections(sections.map(s =>
              s.id === section.id ? { ...s, image: null } : s
            ))}
            className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Brochure Editor</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 border rounded-lg bg-white shadow-sm hover:border-blue-400 transition-colors">
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="png">PNG</option>
            </select>
            <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2 font-medium">
              <span>⬇️</span>
              <span>Generate</span>
            </button>
          </div>
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
          >
            <span>{isPreviewMode ? '✎' : '👁'}</span>
            <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2 font-medium">
            <span>💾</span>
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sections Bar */}
        {!isPreviewMode && (
          <div className="w-full bg-white border-b p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Sections</h2>
              <button
                onClick={addNewSection}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2 font-medium"
              >
                <span>+</span>
                <span>Add Section</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {sections.map(section => (
                <div
                  key={section.id}
                  className="flex items-center bg-slate-50 rounded-lg overflow-hidden shadow-sm border border-slate-200"
                >
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeSection === section.id 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {section.title}
                  </button>
                  {sections.length > 1 && (
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="px-3 py-3 text-red-500 hover:bg-red-50 transition-colors border-l border-slate-200"
                      title="Delete section"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {isPreviewMode ? (
            <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg rounded-lg" style={{ 
              minHeight: '297mm',
              padding: '20mm',
              marginBottom: '20mm',
              boxSizing: 'border-box'
            }}>
              {sections.map(section => (
                <div key={section.id} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                  {section.image && (
                    <img
                      src={section.image}
                      alt={section.title}
                      className="max-w-full h-auto rounded-lg mb-4"
                    />
                  )}
                  <div style={section.style as React.CSSProperties}>{section.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="max-w-4xl mx-auto shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <input
                    type="text"
                    value={sections.find(s => s.id === activeSection)?.title || ''}
                    onChange={(e) => setSections(sections.map(section =>
                      section.id === activeSection
                        ? { ...section, title: e.target.value }
                        : section
                    ))}
                    className="text-xl font-semibold bg-transparent border-b-2 border-slate-200 focus:border-blue-400 outline-none px-1 py-1 transition-colors"
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Add Image"
                  >
                    📷
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <TextEditor section={sections.find(s => s.id === activeSection)!} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
