with
    #
    #The score percentages
    score as (
        select
            student.student,
            year.value as `year.value`,
            class.name as `class.name`,
            exam.name as `exam.name`,
            sitting.date as `sitting.date`,
            stream.id as `stream.id`,
            student.name as `student.name`,

            subject.subject,
            subject.id as `subject.id`,
            subject.name as `subject.name`,
            performance.out_of as `performance.out_of`,

            score.value as `score.value`
       from score 
            inner join candidate on score.candidate=candidate.candidate
            inner join progress on candidate.progress =progress .progress
            inner join student on progress.student = student.student
            inner join year on progress.year = year.year
            inner join stream on year.stream = stream.stream
            inner join class on stream.class = class.class
            inner join school on class.school = school.school
            inner join performance on score.performance=performance.performance
            inner join subject on performance.subject=subject.subject
            inner join sitting on performance.sitting=sitting.sitting
            inner join exam on sitting.exam=exam.exam
        where sitting.sitting=1    
     ),
    #
    #The student details
    student as (
        select distinct
            student,
            `year.value`,
            `class.name`,
            `exam.name`,
            `sitting.date`,
            `stream.id`,
            `student.name`
        from score    
    ),
    #
    #The subject details
    subject as (
        select distinct
            subject,
            `subject.id`,
            `subject.name`,
            `performance.out_of`
        from score    
    )
