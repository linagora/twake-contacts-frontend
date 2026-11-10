import React from 'react'
import { Box, List } from '@linagora/twake-mui'

export interface NestedNavListProps {
  id: string
  children?: React.ReactNode
}

/**
 * Nested entries of a foldable sidebar section: an item holding its own list,
 * so that the sidebar list only has items as children, and so that the toggle
 * of the section can point to it with `aria-controls`.
 */
export const NestedNavList: React.FC<NestedNavListProps> = ({
  id,
  children
}) => (
  <Box component="li">
    <List id={id} disablePadding>
      {children}
    </List>
  </Box>
)
