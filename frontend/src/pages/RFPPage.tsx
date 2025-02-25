import { Container, Title, Paper, Stack, TextInput, Textarea, Button, Group, Text, Divider, Box, Stepper, FileInput } from '@mantine/core'
import { IconFileTypePdf, IconFileTypeDocx, IconBuilding, IconClipboardList, IconClock, IconCurrencyDollar, IconUpload, IconFile } from '@tabler/icons-react'
import { useState } from 'react'

export default function RFPPage() {
  const [active, setActive] = useState(0)
  const [rfpFile, setRfpFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    companyName: '',
    projectTitle: '',
    requirements: '',
    deadline: '',
    budget: '',
    additionalNotes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission logic here
    console.log('Form submitted:', formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Container size="lg" py="xl">
      <Box mb="xl">
        <Title order={1} mb="sm" style={{ color: '#2C3E50' }}>RFP Response Generator</Title>
        <Text size="lg" c="dimmed">Generate professional and tailored responses to Request for Proposals</Text>
      </Box>

      <Stepper active={active} onStepClick={setActive} mb="xl">
        <Stepper.Step label="Company Info" description="Basic details">
          Step 1 content
        </Stepper.Step>
        <Stepper.Step label="Project Details" description="Requirements">
          Step 2 content
        </Stepper.Step>
        <Stepper.Step label="Review" description="Final check">
          Step 3 content
        </Stepper.Step>
      </Stepper>
      
      <Paper shadow="md" radius="lg" p="xl" withBorder style={{ backgroundColor: '#FFFFFF' }}>
        <form onSubmit={handleSubmit}>
          <Stack gap="xl">
            <Box>
              <Group mb="md">
                <IconFile size={24} style={{ color: '#2C3E50' }} />
                <Title order={3}>Upload RFP Document</Title>
              </Group>
              <Divider mb="lg" />
              <FileInput
                label={<Text fw={500}>RFP Document</Text>}
                placeholder="Upload your RFP document"
                accept=".pdf,.doc,.docx"
                leftSection={<IconUpload size={16} />}
                value={rfpFile}
                onChange={setRfpFile}
                description="Upload the RFP document you want to respond to"
                styles={{
                  input: { '&:focus': { borderColor: '#2C3E50' } }
                }}
              />
            </Box>

            <Box>
              <Group mb="md">
                <IconBuilding size={24} style={{ color: '#2C3E50' }} />
                <Title order={3}>Company Information</Title>
              </Group>
              <Divider mb="lg" />
              <TextInput
                label={<Text fw={500}>Company Name</Text>}
                placeholder="Enter the company name"
                required
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                styles={{
                  input: { '&:focus': { borderColor: '#2C3E50' } }
                }}
              />

              <TextInput
                label={<Text fw={500}>Project Title</Text>}
                placeholder="Enter the project title"
                required
                mt="md"
                value={formData.projectTitle}
                onChange={(e) => handleChange('projectTitle', e.target.value)}
                styles={{
                  input: { '&:focus': { borderColor: '#2C3E50' } }
                }}
              />
            </Box>

            <Box>
              <Group mb="md">
                <IconClipboardList size={24} style={{ color: '#2C3E50' }} />
                <Title order={3}>Project Requirements</Title>
              </Group>
              <Divider mb="lg" />

              <Textarea
                label={<Text fw={500}>Project Requirements</Text>}
                placeholder="Enter the detailed project requirements"
                required
                minRows={4}
                value={formData.requirements}
                onChange={(e) => handleChange('requirements', e.target.value)}
                styles={{
                  input: { '&:focus': { borderColor: '#2C3E50' } }
                }}
              />
            </Box>

            <Box>
              <Group mb="md">
                <IconClock size={24} style={{ color: '#2C3E50' }} />
                <Title order={3}>Timeline & Budget</Title>
              </Group>
              <Divider mb="lg" />

              <Group grow>
                <TextInput
                  label={<Text fw={500}>Submission Deadline</Text>}
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  styles={{
                    input: { '&:focus': { borderColor: '#2C3E50' } }
                  }}
                />

                <TextInput
                  label={<Text fw={500}>Budget Range</Text>}
                  placeholder="Enter the project budget range"
                  leftSection={<IconCurrencyDollar size={16} />}
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  styles={{
                    input: { '&:focus': { borderColor: '#2C3E50' } }
                  }}
                />
              </Group>

              <Textarea
                label={<Text fw={500}>Additional Notes</Text>}
                placeholder="Any additional information or special requirements"
                minRows={3}
                mt="md"
                value={formData.additionalNotes}
                onChange={(e) => handleChange('additionalNotes', e.target.value)}
                styles={{
                  input: { '&:focus': { borderColor: '#2C3E50' } }
                }}
              />
            </Box>

            <Group justify="space-between" mt="xl">
              <Button 
                variant="light"
                color="gray"
                onClick={() => setActive(Math.max(0, active - 1))}
                disabled={active === 0}
              >
                Back
              </Button>

              <Group>
                <Button 
                  variant="light"
                  leftSection={<IconFileTypePdf size={20} />}
                  onClick={() => console.log('Download as PDF')}
                >
                  PDF
                </Button>
                <Button 
                  variant="light"
                  leftSection={<IconFileTypeDocx size={20} />}
                  onClick={() => console.log('Download as Word')}
                >
                  Word
                </Button>
                <Button
                  type="submit"
                  style={{ backgroundColor: '#2C3E50' }}
                  onClick={() => setActive(Math.min(2, active + 1))}
                >
                  {active === 2 ? 'Generate Response' : 'Next Step'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
