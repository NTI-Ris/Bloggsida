import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

// Ladda bloggar från fil
let blogs = loadBlogs(); 

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: true }));

// Skapa 'uploads' mappen om den inte existerar
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Konfiguration för filuppladdning med Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.render('index', { blogs: blogs, error: null });
});

// Visar till om-mig sidan
app.get('/om-mig', (req, res) => {
    res.render('Om mig');
});
// Visar till om-mig sidan
app.get('/kontakta-mig', (req, res) => {
    res.render('Kontakta mig'); 
});

// Skapandet av nya bloggar
app.post('/create', (req, res) => {
    const { title, password } = req.body;
    const correctPassword = 'abc123';

    if (password === correctPassword) {
        if (title) {
            const existingBlog = blogs.find(blog => blog.title.toLowerCase() === title.toLowerCase());
            if (existingBlog) {
                res.render('index', { blogs: blogs, error: 'Blogg med samma titel finns redan.' });
            } else {
                blogs.push({ title: title, link: `/room?title=${encodeURIComponent(title)}` });
                saveBlogs(blogs); 
                res.redirect('/');
            }
        } else {
            res.render('index', { blogs: blogs, error: 'Titel får inte vara tom.' });
        }
    } else {
        res.render('index', { blogs: blogs, error: 'Felaktigt lösenord.' });
    }
});

// Radering av bloggar
app.post('/delete/:index', (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (index >= 0 && index < blogs.length) {
        blogs.splice(index, 1);
        saveBlogs(blogs); 
    }
    res.redirect('/');
});

// Visar läsarläge
app.get('/room', (req, res) => {
    const title = req.query.title;
    const posts = loadPosts(title);
    res.render('reader', { title: title, posts: posts });
});

// Visar redigeringsläge
app.get('/edit-room', (req, res) => {
    const title = req.query.title;
    const posts = loadPosts(title);
    res.render('room', { title: title, posts: posts }); 
});

// Radering av inlägg
app.post('/post', upload.single('filename'), (req, res) => {
    const { text, room } = req.body;
    const file = req.file;
    const post = { text: text, image: file ? file.filename : null };

    savePost(room, post);
    res.redirect(`/edit-room?title=${encodeURIComponent(room)}`); 
});

app.post('/delete-post', (req, res) => {
    const { room, index } = req.body;
    let posts = loadPosts(room);


    if (index >= 0 && index < posts.length) {
        if (posts[index].image) {
            const imagePath = path.join('uploads', posts[index].image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); 
            }
        }
        posts.splice(index, 1);
    }

    savePosts(room, posts); 
    res.redirect(`/edit-room?title=${encodeURIComponent(room)}`);
});


// Spara inlägg till en fil
function savePost(room, post) {
    const posts = loadPosts(room);
    posts.push(post);
    fs.writeFileSync(`posts/${room}.json`, JSON.stringify(posts));
}

// Spara alla inlägg till en fil för radering
function savePosts(room, posts) {
    fs.writeFileSync(`posts/${room}.json`, JSON.stringify(posts));
}


function loadPosts(room) {
    if (!fs.existsSync('posts')) {
        fs.mkdirSync('posts');
    }

    const filePath = `posts/${room}.json`;
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    }
    return [];
}

// Sparar bloggar till en fil
function saveBlogs(blogs) {
    fs.writeFileSync('blogs.json', JSON.stringify(blogs));
}

// Laddar bloggar från en fil
function loadBlogs() {
    if (fs.existsSync('blogs.json')) {
        const data = fs.readFileSync('blogs.json');
        return JSON.parse(data);
    }
    return [];
}
// Lösenordsverifiering
app.post('/verify-password', bodyParser.json(), (req, res) => {
    const { password, title } = req.body;
    const correctPassword = 'abc123'; 

    if (password === correctPassword) {
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Fel lösenord.' });
    }
});

// Starta servern
app.listen(port, () => {
    console.log('Server started on port 3000');
});
