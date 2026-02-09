import { Router, Request, Response } from 'express'
// import { ServerBlockNoteEditor } from '@blocknote/server-util'
import { AppDataSource } from '../datasource'
import { Note } from '../entities/Note'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// GET: 認証不要（一覧・詳細は誰でも取得可能）
router.get('/', async (req: Request, res: Response) => {
  try {
    const noteRepo = AppDataSource.getRepository(Note)
    const notes = await noteRepo.find({
      order: { updatedAt: 'DESC' },
    })
    res.json(notes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ノート取得（1件）
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const noteRepo = AppDataSource.getRepository(Note)
    const note = await noteRepo.findOne({
      where: { id: Number(req.params.id) },
    })

    if (!note) {
      res.status(404).json({ error: 'Note not found' })
      return
    }

    res.json(note)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ノート取得（Markdown形式）
// router.get('/:id/markdown', async (req: Request, res: Response) => {
//   try {
//     const noteRepo = AppDataSource.getRepository(Note)
//     const note = await noteRepo.findOne({
//       where: { id: Number(req.params.id) },
//     })

//     if (!note) {
//       res.status(404).json({ error: 'Note not found' })
//       return
//     }

//     // コンテンツが空の場合
//     if (!note.content) {
//       res.json({ title: note.title, markdown: '' })
//       return
//     }

//     const editor = ServerBlockNoteEditor.create()
//     const blocks = JSON.parse(note.content)
//     const markdown = await editor.blocksToMarkdownLossy(blocks)

//     res.json({ title: note.title, markdown })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// })

// ノート取得（HTML形式）
// router.get('/:id/html', async (req: Request, res: Response) => {
//   try {
//     const noteRepo = AppDataSource.getRepository(Note)
//     const note = await noteRepo.findOne({
//       where: { id: Number(req.params.id) },
//     })

//     if (!note) {
//       res.status(404).json({ error: 'Note not found' })
//       return
//     }

//     if (!note.content) {
//       res.json({ title: note.title, html: '' })
//       return
//     }

//     const editor = ServerBlockNoteEditor.create()
//     const blocks = JSON.parse(note.content)
//     const html = await editor.blocksToHTMLLossy(blocks)

//     res.json({ title: note.title, html })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// })

// POST/PUT/DELETE: 認証必須
// ノート作成
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body

    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }

    const noteRepo = AppDataSource.getRepository(Note)
    const note = noteRepo.create({
      title,
      content,
      userId: req.user!.userId,
    })
    await noteRepo.save(note)

    res.status(201).json(note)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ノート更新
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const noteRepo = AppDataSource.getRepository(Note)
    const note = await noteRepo.findOne({
      where: { id: Number(req.params.id), userId: req.user!.userId },
    })

    if (!note) {
      res.status(404).json({ error: 'Note not found' })
      return
    }

    const { title, content } = req.body
    if (title !== undefined) note.title = title
    if (content !== undefined) note.content = content
    await noteRepo.save(note)

    res.json(note)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ノート削除（ソフトデリート）
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const noteRepo = AppDataSource.getRepository(Note)
    const note = await noteRepo.findOne({
      where: { id: Number(req.params.id), userId: req.user!.userId },
    })

    if (!note) {
      res.status(404).json({ error: 'Note not found' })
      return
    }

    await noteRepo.softRemove(note)
    res.json({ message: 'Note deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
