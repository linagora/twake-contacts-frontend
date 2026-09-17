import { Grid } from '@linagora/twake-mui'

interface FormRowProps {
  children: React.ReactNode
}

export const FormRow: React.FC<FormRowProps> = ({ children }) => (
  <Grid container spacing={2}>
    {children}
  </Grid>
)
