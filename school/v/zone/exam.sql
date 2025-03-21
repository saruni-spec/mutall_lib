/*Query that retrieves data related to student scores and exams sittings*/

with
    student_score as (
            select
                score.score as `score.score`,
                sitting.sitting as `sitting.sitting`,
                reverse(student.name) as `student.name`,
                sitting.date as `sitting.date`,
                stream.stream as `stream.stream`,
                year.value as `year.value`,
                exam.id as `exam.id`,
                subject.id as ` subject.id`,
                score.value as` score.value`,
                performance.performance as `performance.performance`,
                candidate.candidate as `candidate.candidate`,
                performance.out_of `performance.out_of`,
               round( score.value / performance.out_of * 100,0) as percent
             from
                score
                inner join  performance on score.performance = performance.performance
                inner join subject on performance.subject = subject.subject
                inner join sitting on  sitting.sitting = performance.sitting
                inner join exam on sitting.exam = exam.exam
                inner join candidate on score.candidate = candidate.candidate
                inner join progress on candidate.progress = progress.progress
                inner join year on progress.year = year.year
                inner join stream on year.stream = stream.stream
                inner join student on progress.student = student.student
        where
            not (score.value = '')
        order by 
            student.name,
            sitting.date,
            exam.id,
            subject.id
    ),
all_sitting as(
    select
        # LEFTIE, This will be used as our row index for the leftie section
        sitting.date as`sitting.date`,
        sitting.date as `sitting`,
        #
        # BODY,This column will be used as basic value in the body matrix
        exam.id as `exam.id`,
        #
        # HEADER,This will be for indexing the header section
        stream.stream as `stream.stream`,
        #
        # This two columns will be displayed on the header section
        class.name as `class.name`,
        stream.id as `stream.id`,
        # 
        # Join the class and stream id
        concat(class.name, "/", stream.id) as 'class_stream' ,
        #    
        # ????????
        sitting.sitting as `sitting.sitting`

    from
        sitting
        inner join year on sitting.year=year.year
        inner join exam on sitting.exam=exam.exam
        inner join stream on year.stream=stream.stream
        inner join class on stream.class=class.class
        inner join school on class.school=school.school
    )



    
 

    
