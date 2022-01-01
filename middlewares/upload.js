const req = require('express/lib/request')
const multer = require('multer')

// innilization multer diskStorage
// make distination file for upload

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null,'public/images/uploads') //file storage location
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname) // rename filename by date now and original filename
    }
})

const upload = multer({ storage: storage })

module.exports = upload;