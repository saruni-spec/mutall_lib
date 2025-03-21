 with 
    students as (
        select distinct
            student.student,
            score.source,
            student.name as student_name,
            year.value as year_value,
            class.name as class_name
          from
              score
              inner join candidate on score.candidate=candidate.candidate
              inner join progress on candidate.progress=progress.progress
              inner join student on progress.student=student.student 
              inner join year on progress.year=year.year
              inner join stream on year.stream=stream.stream
              inner join class on stream.class=class.class
       ),
    -- Retrieving the csv names where the classes distrubtion came from
    -- 
    csv as(
        select
            source,
            substring(csv.name,49) as name 
        from
            source
            inner join csv on source.csv=csv.csv
    ),
    -- Retrieving the students and the csv names where the original data came from
    sources as(
        select 
            students.*,
            csv.name as csv_names
        from
            students
            left join csv on students.source=csv.source
        order by
            student_name
    ),
    -- Retrieving all the dates that the students had a sitting 
    all_dates as (
        select distinct
            year_value as years,
            year_value
    from
       students
    order by
        year_value
        )
                

        
        
    
   


    