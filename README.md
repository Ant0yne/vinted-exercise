# Backend Exercises - Vinted

An exercise to recreate the Vinted website. It's part of my training to become a web and mobile developer with the school "Le Reacteur"

## Routes

### Users

- POST - _Sign up_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/user/signup`

This is the request to create an account.  
Here are the _body_ parameters to send with the request :

`username`  
**-REQUIRED-**  
String

`email`  
**-REQUIRED-**  
String

`password`  
**-REQUIRED-**  
String

`avatar`  
Unique Img File

- POST - _Login_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/user/login`

This is the request to login to your account.  
Here are the _body_ parameters to send with the request :

`email`  
**-REQUIRED-**  
String

`password`  
**-REQUIRED-**  
String

### Offers

- POST - _Publish_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/offer/publish`

This is the request to publish a new offer.  
Here is the _header Authorization_ parameters to send with the request :

`Token`  
**-REQUIRED-**  
Bearer Token

Here are the _body_ parameters to send with the request :

`title`  
**-REQUIRED-**  
String

`description`  
**-REQUIRED-**  
String

`price`  
**-REQUIRED-**  
Number

`ìmage`  
**-REQUIRED-**  
Unique Img File

`brand`  
String

`size`  
String

`condition`  
String

`color`  
String

`city`  
String

`pictures`  
Multiple Img Files

- GET - _Read offers_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/offers`

This is the request to read all existing offers or to sort them with some options.  
Here are the _query_ parameters to send with the request. **If no query is sent, it will return the 5 first offers by descending price** :

`title`  
String

`description`  
String

`priceMin`  
Number

`priceMax`  
Number

`sort`  
String
Can only be "**price-desc**" (descending price) or "**price-asc**" (ascending price)

`page`
Number

- GET - _Read a specific offer_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/offers/:id`

This is the request to read a specific offer.  
Here is the _params_ parameters to send with the request :

[MongoDB ObjectId](https://www.mongodb.com/docs/manual/reference/bson-types/#objectid)

- PUT - _Modify an offer_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/offer/:id`

This is the request to modify an offer you created.  
Here is the _header Authorization_ parameters to send with the request :

`Token`  
**-REQUIRED-**  
Bearer Token

Here are the _body_ parameters to send with the request. **You need to send at least one** :

`title`  
String

`description`  
String

`price`  
Number

`ìmage`  
Unique Img File

`brand`  
String

`size`  
String

`condition`  
String

`color`  
String

`city`  
String

**_Not implemented yet_**  
`pictures`  
Multiple Img Files

- DELETE - _Delete an offer_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/offer/:id`

**_If you uploaded pictures with your offer, they will not be deleted as the feature is not implemented yet._**  
This is the request to delete an offer you created.  
Here is the _header Authorization_ parameters to send with the request :

`Token`  
**-REQUIRED-**  
Bearer Token

Here is the _params_ parameters to send with the request :

[MongoDB ObjectId](https://www.mongodb.com/docs/manual/reference/bson-types/#objectid)

### Payment

- POST - _Buy an offer_

`https://site--vinted-backend-exercise--spyfkvx5gdbh.code.run/payment`

This is the request to buy an offer (using stripe)
Here are the _body_ parameters to send with the request :

`title`  
**-REQUIRED-**  
String

`amount`  
**-REQUIRED-**  
Number

## Work in progress

- delete all the offer's pictures when the offer is deleted
- change an offer's pictures (add one or more, delete one or more)
- ignore case for username and email
- when an offer is cre
- when a payment is done, create a Payment document in DDB
- when a payment is done, retreive the id by body then update the key "isPurchased" for the offer document in DDB
- when a payment is done, retreive the id by body then update the key "purchased" for the user with the payment info
- dryer code (repetition, create some module, ...)
- add password rules (uppercase, lowercase, symbol, ...)
- check the type of file (img? video? ...?)
