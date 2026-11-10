import { useCallback } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { importContacts, uploadImportFile } from '../ContactsDao'

export interface ImportContacts {
  /** Uploads a vCard file and resolves to its id on the backend. */
  uploadFile: (file: File) => Promise<string>
  /** Imports the uploaded file into a book of the current user. */
  importIntoBook: (fileId: string, addressBookId: string) => Promise<void>
}

/** Imports vCard files into the address books of the current user. */
export function useImportContacts(): ImportContacts {
  const userId = useAppSelector(state => state.user.userData.openpaasId)

  const importIntoBook = useCallback(
    (fileId: string, addressBookId: string): Promise<void> =>
      importContacts(fileId, `/addressbooks/${userId}/${addressBookId}.json`),
    [userId]
  )

  return { uploadFile: uploadImportFile, importIntoBook }
}
