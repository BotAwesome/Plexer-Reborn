import { exec } from 'child_process'
import { promisify } from 'util'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'

const execAsync = promisify(exec)

/**
 * Electron-based audio transcoding using ffmpeg-static
 * For AC-3 to AAC transcoding in Electron
 */
class ElectronTranscoding {
  /**
   * Get FFmpeg path
   */
  getFFmpegPath() {
    return ffmpegStatic || 'ffmpeg'
  }
  
  /**
   * Transcode audio from AC-3 to AAC
   */
  async transcodeAC3ToAAC(inputPath, outputPath) {
    const ffmpegPath = this.getFFmpegPath()
    
    const command = `"${ffmpegPath}" -i "${inputPath}" -acodec aac -b:a 192k "${outputPath}"`
    
    try {
      const { stdout, stderr } = await execAsync(command)
      return { success: true, output: stdout, error: stderr }
    } catch (error) {
      console.error('FFmpeg transcoding error:', error)
      throw error
    }
  }
  
  /**
   * Check if file has AC-3 audio
   */
  async checkAudioCodec(filePath) {
    const ffmpegPath = this.getFFmpegPath()
    const command = `"${ffmpegPath}" -i "${filePath}" 2>&1 | findstr /i "Audio:"`
    
    try {
      const { stdout } = await execAsync(command)
      return stdout.includes('ac3') || stdout.includes('AC-3')
    } catch (error) {
      return false
    }
  }
}

export default new ElectronTranscoding()


