const express = require('express');
const db = require('./connection/db');
const session = require('express-session');
const flash = require('express-flash');
const res = require('express/lib/response');
const bcrypt = require('bcrypt');
const upload = require('./middlewares/upload')
const { password } = require('pg/lib/defaults');
const { reject } = require('bcrypt/promises');
const app = express();
const PORT = 5009;



app.set('view engine', 'hbs');  //setting template engine
app.use('/public', express.static(__dirname + '/public'));  //use folder parent
app.use(express.urlencoded({ extended: false }));  //receive file array,string or object
app.use(flash())

app.use(
    session({
        cookie: {
            maxAge: 2 * 60 * 60 * 1000,
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: 'secretValue'
    })
)



// let isLogin = false;


app.get('/', (req, res) => {
    res.render('home')    // render file to UI
})

app.get('/home', (req, res) => {

    db.connect((err, client, done) => {
        if (err) throw err

        client.query('SELECT * FROM tb_project', (err, result) => {
            done()
            let data = result.rows

            // console.log(data)

             res.render('home', {data : data})    // render file to UI
        })
    })
})

app.get('/blog', (req, res) => {

    let query = `SELECT blog.id, blog.title, blog.content, blog.image,  tb_user.name AS author, blog.post_at
                FROM blog LEFT JOIN tb_user
                ON blog.author_id = tb_user.id`
    
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            let data = result.rows

            data= data.map((item) => {
                return {
                    ...item,
                    post_at: getFullTime(item.post_at),
                    isLogin: req.session.isLogin,
                    image:'../public/images/uploads/' +item.image
                    }
                })
        
            // console.log(data)
            res.render('blog',
                {
                    isLogin: req.session.isLogin,
                    blogs: data,
                    user: req.session.user

                })   
        })
    })
})

app.post('/blog', upload.single('image'), (req, res) => {     // send/create data to file blog
    let data = req.body

    if (!req.session.isLogin) {
        req.flash('danger','Please Login!!!')     
      return  res.redirect('/add-blogs')
    }

    let authorId = req.session.user.id
    let image = req.file.filename

    let query=`INSERT INTO blog (title, content, image, author_id)VALUES ('${data.title}','${data.content}','${image}','${authorId}')`
    db.connect( (err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            if (err) throw err

            req.flash('add-blog','Blog Ad success ')
            res.redirect('/blog')
        })
    })
})

app.get('/add-blogs', (req, res) => {
    res.render('add-blogs', {
        isLogin: req.session.isLogin,
        user: req.session.user
    })    
})

app.get('/blogs-edit/:id', (req, res) => {
    let id = req.params.id

    db.connect((err, client, done) => {
        if (err) throw err

        client.query(`SELECT * FROM blog WHERE id = ${id}`, (err, result) => {
           if (err) throw err
            let data = result.rows[0]
            
            console.log(data)

            res.render('edit-blogs',{id :id, blog: data})
        })
    })
})

app.post('/blogs-edit/:id',upload.single('image'), (req, res) => {
    let id =req.params.id
    let data = req.body
    let image = req.file.filename
    let authorId = req.session.user.id

    let query = `UPDATE blog SET title= '${data.title}', content='${data.content}', image='${image}', author_id='${authorId}' WHERE id=${id}`
    
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
           if (err) throw err
            // console.log(data)

            req.flash('update','blog success update')
            res.redirect('/blog')
        })
    })
})

app.get('/blog-detail/:id', (req, res) => {
    
    let id = req.params.id
    let query = `SELECT blog.id, blog.title, blog.content, blog.image,  tb_user.name AS author, blog.post_at
                FROM blog LEFT JOIN tb_user
                ON blog.author_id = tb_user.id WHERE blog.id=${id}`
    
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            if (err) throw err
            
            let data = result.rows
                data = data.map((items) => {
                    return {
                        ...items,
                        post_at: getFullTime(items.post_at),
                        image: '../public/images/uploads/' +items.image
                }
            })
           

            res.render('detail-blogs',{id :id, blog: data})
        })
    })
})

app.get('/delete-blogs/:id', (req, res) => {
    let id = req.params.id
   
    let query = `DELETE FROM blog WHERE id= ${id}`
    
    db.connect( (err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            if (err) throw err
            req.flash('hapus','success delete blog')
            res.redirect('/blog')
        })
    })
})

//==============Registrasi and Login=================
app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', (req, res) => {
    let { name, email, password } = req.body
    
    // console.log(req.body)
    const hashedPassword = bcrypt.hashSync(password, 10)
    
    db.connect((err, client, done) => {
        if (err) throw err
        let query = `INSERT INTO tb_user (name, email , pass) VALUES ('${name}','${email}','${hashedPassword}')`

        client.query(query, (err, result) => {
            if (err) throw err
            // console.log(result.rows)
            
            req.flash('sukses','Registrasi Success')
            res.redirect('/login')
        })
    })
})

app.get('/login', (req, res) => {
   
    res.render('login')
})

app.post('/login', (req, res) => {
    const { email, password } = req.body
   
    let query=`SELECT * FROM tb_user WHERE email = '${email}'`
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            if (err) throw err
            
            if (result.rows.length == 0) {
                req.flash('danger','password and email wrong')
               return res.redirect('/login')
            }
            let isMatch = bcrypt.compareSync(password,result.rows[0].pass)
            
            if (isMatch) {
                req.session.isLogin = true
                req.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                }
                req.flash('success','login success')
                res.redirect('/blog')
            } else {
                req.flash('danger','password and email wrong')
                res.redirect('/login')
            }
        })
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/blog')
})

//==============***END***==============


app.get('/contact', (req, res) => {
    res.render('contact')    // render file to UI
})

// create port to use backend
app.listen(PORT, () => {
    console.log(`Running in localhost:${PORT}`);
})
//====end port======



//  group function
let month = [ 
    'January', 
    'February', 
    'March', 
    'April', 
    'May', 
    'June', 
    'July', 
    'August', 
    'September', 
    'October', 
    'November', 
    'December'
]


function getFullTime(time){
let date = time.getDate()
let monthIndex =time.getMonth()
let year = time.getFullYear()

let hours = time.getHours()
let minutes = time.getMinutes()

let result =`${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`
return result
}

let blogs = [
    {   
        id : '1',
        titleBlog: 'Pasar Coding di Indonesia Masih menjanjikan Jiwa',
        author : 'Ilham Adi',
        content: 'Ketimpangan sumber daya manusia (SDM) di sektor digital masih menjadi isu yang belum terpecahkan. Berdasarkan penelitian ManpowerGroup, ketimpangan SDM global, termasuk Indonesia, meningkat dua kali lipat dalam satu dekade terakhir. Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quam, molestiae numquam! Deleniti maiores expedita eaque deserunt quaerat! Dicta, eligendi debitis?',
        post_at: '12 Jul 2021 22:30 WIB'
    }
]




