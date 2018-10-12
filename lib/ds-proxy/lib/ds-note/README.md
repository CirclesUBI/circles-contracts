<h2>DSNote
  <small class="text-muted">
    <a href="https://github.com/dapphub/ds-note"><span class="fa fa-github"></span></a>
  </small>
</h2>

_Log function calls as events_
  
Provides generic function call logging by way of a `note` modifier which 
triggers the capture of data as a `LogNote` event containing:

* `msg.sig` (indexed)
* `msg.sender` (indexed)
* The first function parameter (indexed)
* The second function parameter (indexed)
* `msg.value`
* `msg.data`

Functions decorated with the `note` modifier will log this information whenever 
they are called with the indexed fields being queryable by blockchain clients. 
This covers most usecases for events, making this an easy way to quickly add 
event logging to your dapp.
