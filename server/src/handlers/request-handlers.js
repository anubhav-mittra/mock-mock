const { saveToFirestore, getFromFirestore, deleteFromFirestore } = require('../services/firestore');
const { generateSample } = require('../services/sample-generator');

/**
 * Handles GET requests for a mock endpoint.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function handleGet(req, res) {
  const { collection, docId } = req.params;
  try {
    const data = await getFromFirestore(req.app.locals.db, collection, docId);
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(404).json({ message: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
}

/**
 * Handles POST requests for a mock endpoint.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function handlePost(req, res) {
  const { collection, docId } = req.params;
  const data = req.body;
  try {
    await saveToFirestore(req.app.locals.db, collection, docId, data);
    res.status(201).json({ message: 'Document created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
}

/**
 * Handles DELETE requests for a mock endpoint.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function handleDelete(req, res) {
  const { collection, docId } = req.params;
  try {
    await deleteFromFirestore(req.app.locals.db, collection, docId);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete data' });
  }
}

module.exports = { handleGet, handlePost, handleDelete };