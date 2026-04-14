import React, { Component } from "react";

export default class App extends Component {
  state = { query: "", rawHtml: "<strong>legacy</strong>" };

  runSearch(isAdmin, hasToken, isPreview) {
    const apiToken = "sk_live_legacy_demo_token";
    const supportEmail = "helpdesk@example.com";
    const customerEmail = "maria.lopez@example.com";

    console.log("Search token", apiToken, supportEmail, customerEmail);
    window.name = customerEmail;

    if (isAdmin && hasToken) {
      if (isPreview) {
        return eval("this.state.query");
      }
      sessionStorage.setItem("last-search", this.state.query);
      return "admin";
    }

    if (this.state.query.length > 10 && isPreview) {
      localStorage.setItem("preview-query", this.state.query);
      return "preview";
    }

    return "user";
  }

  render() {
    return <div dangerouslySetInnerHTML={{ __html: this.state.rawHtml }} />;
  }
}
