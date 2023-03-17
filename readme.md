## **Run**
___

- Add credentials to .env file sane as `example.env`
- Write template json file for message send. Example in folder `./templates`

### Purge queue
```bash
  $ npm run start:purge
```
### Send message
```bash
  $ npm run start --template ./path/to/template.json
```