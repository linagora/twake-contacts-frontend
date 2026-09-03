import { Box, CircularProgress } from '@linagora/twake-mui'

export function Loading() {
  return (
    <Box
      data-testid="loading"
      sx={{
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}
    >
      <CircularProgress />
    </Box>
  )
}
