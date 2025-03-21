with 
    #
    # The template query that generates the data entry template. This table is 
    # left joined to teh data data table to gemerate the joint version
    # In our case, its the product table
    template as (
        select
            #
            #The product primary key
            product.product as `product.product`,

            # The default product unit will be assumed
            product.unit as `stock.unit`,
            #
            #Product name will be read-only, i.e., for display only
            product.name,
            #
            # Fill the stock date, so that user does not need to supply it. It
            # is part of the template
            '2024-06-05' as `session.date`,
            'liz' as `staff.name`
        from
            product
    ),
    #
    # The data query identifies all columns that are new inputs. In our case the 
    # session date is a new input
    `data` as (
        select
            product.product,
            stock.stock as `stock.stock`,
            stock.qty as `stock.qty`,
            session.date as `session.date`,
            staff.name as `staff.name`
        from
            stock
            inner join product on stock.product = product.product
            inner join session on stock.session=session.session
            inner join staff on session.staff = staff.staff
        where
            # The date of stock taking is known
            session.date='2024-06-05'
    ),
    #
    #The shape of the complete data entry form
    `form` as (
        select
            if(data.`staff.name` is null, template.`staff.name`, data.`staff.name`) as `staff.name`,
            if(data.`session.date` is null, template.`session.date`, data.`session.date`) as `session.date`,
            `stock.unit`,
            `product.product`,
            #
            #Poduct name is read-only. It needs not be saved to database
            name,
            `stock.stock`,
            `stock.qty`
        from
            template
            left join `data` on `data`.product = template.`product.product`
        order by name    
    )
    select
        #Data may come from db or template
        #
        `session.date`,
        `staff.name`,
        `stock.unit`,
        `product.product`,
        #
        #Poduct name is read-only. It needsnot be saved to the database
        name,
        #
        `stock.stock`,
        `stock.qty`    
    from
        form