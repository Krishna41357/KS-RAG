#!/usr/bin/env python
"""Create 4 sample PDF files for testing."""

import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from textwrap import wrap

# Create uploads directory
os.makedirs('uploads', exist_ok=True)

pdfs = [
    ('uploads/python_basics.pdf', 'Python Basics', 
     'Python is a high-level programming language. Key features: dynamic typing, indentation-based syntax, rich standard library. '
     'Data types: int, float, str, list, dict, tuple, set. Variables: x = 10. Functions: def add(a,b): return a+b. '
     'Loops: for i in range(10). Conditionals: if x > 5. Python is widely used for web development, data science, and automation.'),
    
    ('uploads/ml_concepts.pdf', 'Machine Learning', 
     'Machine learning enables systems to learn from data. Types: supervised (regression, classification), unsupervised (clustering), reinforcement. '
     'Algorithms: linear regression, decision trees, random forest, SVM, K-means, neural networks. '
     'Evaluation metrics: accuracy, precision, recall, F1 score, AUC. Popular libraries: scikit-learn, TensorFlow, PyTorch, pandas. '
     'Common applications: image recognition, natural language processing, recommendation systems.'),
    
    ('uploads/web_dev.pdf', 'Web Development', 
     'Frontend: HTML for structure, CSS for styling, JavaScript for interactivity. Backend: Node.js, Flask, Django, REST API, GraphQL. '
     'Databases: PostgreSQL for relational data, MongoDB for NoSQL, Redis for caching. '
     'Security: HTTPS encryption, authentication using JWT/OAuth, CORS policies, input validation to prevent SQL injection. '
     'Responsive design using media queries and flexbox layouts.'),
    
    ('uploads/cloud_computing.pdf', 'Cloud Computing', 
     'Cloud service models: IaaS (AWS, Azure, GCP), PaaS (Heroku, App Engine), SaaS (Salesforce, Office365). '
     'Deployment models: public, private, hybrid, community clouds. Benefits: scalability, cost-effective, reliability, flexibility. '
     'Major providers: Amazon Web Services, Microsoft Azure, Google Cloud Platform. '
     'Considerations: vendor lock-in, data privacy, compliance requirements, network latency.')
]

for filepath, title, content in pdfs:
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont('Helvetica-Bold', 16)
    c.drawString(50, height - 50, title)
    
    # Content
    c.setFont('Helvetica', 10)
    y = height - 80
    
    # Wrap text and draw
    for line in wrap(content, width=85):
        if y < 50:
            c.showPage()
            c.setFont('Helvetica', 10)
            y = height - 50
        c.drawString(50, y, line)
        y -= 15
    
    c.save()
    print(f'Created: {filepath}')

print('\nAll 4 PDFs created successfully!')
