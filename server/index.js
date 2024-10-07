const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors({
    origin: '*', // Allows all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify the allowed methods
    allowedHeaders: ['Content-Type'], // Specify the allowed headers
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));



const getInfo = (html,negative, marksperquestion) => {
    const $ = cheerio.load(html);

    // Extract the required information from the table
    const examTitle = $('div.main-info-pnl div strong span').text();
    const rollNumber = $('tr:contains("Roll Number") td').eq(1).text();
    const candidateName = $('tr:contains("Candidate Name") td').eq(1).text();
    const venueName = $('tr:contains("Venue Name") td').eq(1).text();
    const examDate = $('tr:contains("Exam Date") td').eq(1).text();
    const examTime = $('tr:contains("Exam Time") td').eq(1).text();
    const subject = $('tr:contains("Subject") td').eq(1).text();

    // answer key 
    const body = []
    const overall = {label:"overall",attempted: 0, marks: 0, right: 0, wrong: 0, notAttempted:0};
    const sections = $('div.grp-cntnr .section-cntnr')
    sections.map((index, el) => {
        const label = $(el).find('.section-lbl .bold').text()
        let right = 0;
        let attempted = 0;
      
        const questions = $(el).find('.question-pnl');
        questions.map((index, el) => {
            const chosenOption = $(el).find('.questionPnlTbl .menu-tbl tr').last().find('.bold').text();                
            let correctOption;
            if(!isNaN(chosenOption)){
                attempted++;
                const tr = $(el).find('.questionPnlTbl .questionRowTbl tr').slice(-4);
               tr.map((index, row) => {
               
                
                const rightAnsCells = $(row).find('td.rightAns');

                // Check if there is exactly one 'rightAns' in the row
                if (rightAnsCells.length === 1) {
                    correctOption = index+1; // Store the index of the matching row
                    return false; // Break out of the loop
                }
               })
           
            }
           
            
          if(chosenOption == correctOption) {
           
            right++
          }
          
            
        })
        const wrong = attempted - right;
        const marks = right * marksperquestion - wrong * negative  
        const notAttempted = questions.length - attempted

        overall.attempted += attempted
        overall.right += right
        overall.wrong += wrong
        overall.marks += marks
        overall.notAttempted += notAttempted
        body.push({
            label,
            attempted,
            notAttempted ,
            right ,
            wrong,
            marks
        })
    })
     body.push(overall)
    return {
        header: {
            examTitle,
            rollNumber,
            candidateName,
            venueName,
            examDate,
            examTime,
            subject
        },
        body
    };
}

app.get('/result', async(req, res) => {
    const { url } =req.query;
    const negative = 0.5;
    const marksperquestion = 2;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    try {
        const result = await axios.get(url);
        const html = result.data;
       const data = getInfo(html,negative, marksperquestion)
       res.send(data)

        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data from the provided URL');
        
    }
})

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
