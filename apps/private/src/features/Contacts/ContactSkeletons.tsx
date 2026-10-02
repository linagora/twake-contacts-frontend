import {
  Skeleton,
  Stack,
  Button,
  ListSkeleton,
  Grid
} from '@linagora/twake-mui'
import { Icon, Left } from '@linagora/twake-icons'
import React from 'react'
import { useI18n } from 'twake-i18n'

export const ContactFormSkeleton: React.FC = () => {
  const { t } = useI18n()

  return (
    <Stack spacing={3} useFlexGap>
      <Stack direction="row" className="u-flex u-flex-justify-between">
        <Button variant="text" startIcon={<Icon icon={Left} />} disabled>
          {t('contacts.back')}
        </Button>
        <Skeleton
          variant="rounded"
          className="u-bdrs-8"
          width={80}
          height={36}
        />
      </Stack>

      <Stack direction="row" spacing={3} className="u-flex-items-center">
        <Skeleton variant="circular" width={80} height={80} />
        <Skeleton variant="text" width={200} height={40} />
      </Stack>

      <Stack spacing={3} className="u-maw-7">
        <Grid container spacing={2}>
          <Grid size={4}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
          <Grid size={4}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={8}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={6}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
          <Grid size={2}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={8}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={8}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={6}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
          <Grid size={2}>
            <Skeleton variant="rounded" height={56} />
          </Grid>
        </Grid>

        <div>
          <Skeleton variant="text" width={80} height={36} />
        </div>
      </Stack>
    </Stack>
  )
}

export const ContactDetailsSkeleton: React.FC = () => {
  const { t } = useI18n()

  return (
    <Stack spacing={3}>
      <Stack direction="row" className="u-flex u-flex-justify-between">
        <Button variant="text" startIcon={<Icon icon={Left} />} disabled>
          {t('contacts.back')}
        </Button>
        <div className="u-flex u-flex-items-center">
          <Skeleton
            className="u-mr-1 u-bdrs-8"
            variant="rounded"
            width={80}
            height={40}
          />
          <Skeleton variant="circular" width={24} height={24} />
        </div>
      </Stack>

      <>
        <Stack direction="row" spacing={3} className="u-flex-items-center">
          <Skeleton variant="circular" width={80} height={80} />
          <Skeleton variant="text" width={200} height={40} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <Skeleton
            variant="rounded"
            className="u-bdrs-8"
            width={100}
            height={36}
          />
          <Skeleton
            variant="rounded"
            className="u-bdrs-8"
            width={100}
            height={36}
          />
          <Skeleton
            variant="rounded"
            className="u-bdrs-8"
            width={100}
            height={36}
          />
        </Stack>

        <ListSkeleton count={4} />
      </>
    </Stack>
  )
}
