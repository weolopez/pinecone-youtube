curl --request POST \
     --url https://weo-memory-9a93337.svc.us-east1-gcp.pinecone.io/vectors/upsert \
     --header 'Api-Key: 9919b298-7909-4023-8033-516511fbeab2' \
    --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
     "vectors": [
          {
               "id": "example-vector-1",
               "values": [
                    0.1,
                    0.2,
                    0.3,
                    0.4,
                    0.5,
                    0.6,
                    0.7,
                    0.8
               ],
               "sparseValues": {
                    "indices": [
                         1,
                         312,
                         822,
                         14,
                         980
                    ],
                    "values": [
                         0.1,
                         0.2,
                         0.3,
                         0.4,
                         0.5
                    ]
               },
               "metadata": {
                    "genre": "documentary",
                    "year": 2019
               }
          }
     ],
     "namespace": "example-namespace"
}
'

