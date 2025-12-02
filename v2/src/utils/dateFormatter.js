import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'

// Configure dayjs to use German locale and plugins
dayjs.extend(relativeTime)
dayjs.locale('de')

/**
 * Date formatting utilities using dayjs
 */
export const dateFormatter = {
  /**
   * Format date to German format (DD.MM.YYYY)
   */
  formatDate(date, format = 'DD.MM.YYYY') {
    if (!date) return ''
    return dayjs(date).format(format)
  },
  
  /**
   * Format date to relative time (e.g., "vor 2 Stunden")
   */
  formatRelative(date) {
    if (!date) return ''
    return dayjs(date).fromNow()
  },
  
  /**
   * Get year from date
   */
  getYear(date) {
    if (!date) return ''
    return dayjs(date).format('YYYY')
  },
  
  /**
   * Check if date is valid
   */
  isValid(date) {
    return dayjs(date).isValid()
  }
}


