/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from 'next/router'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from 'react-beautiful-dnd'

// Define types for project data
interface Project {
    projectIdx: number
    title: string
}

export default function CategoryDetail() {
    const me = useQuery({
        queryKey: ['me'],
        queryFn: async () => await axios.get('/api/me'),
    })

    const router = useRouter()
    const { categoryIdx } = router.query
    const idx = Number(categoryIdx)

    // Fetch the projects for the current category
    const { data: projects, refetch } = useQuery<Project[]>({
        queryKey: ['projects', idx],
        queryFn: async () => {
            if (!idx) return [] // Return empty array if no idx
            const response = await axios.get(`/api/category/${idx}/projects`)
            return response.data
        },
        enabled: !!idx, // Run query only if idx is available
    })

    // Mutation to create a new project
    const createProjectMutation = useMutation({
        mutationFn: async (data: {
            title: string
            categoryIdx: number
            priorityIdx: number
        }) => {
            try {
                await axios.post(
                    `/api/category/${data.categoryIdx}/projects`,
                    data
                )
            } catch (error: any) {
                const errorMsg =
                    error.response?.data?.message || 'Error creating project.'
                alert(errorMsg)
                console.error('An error occurred:', error)
            }
        },
        onSuccess: () => {
            refetch() // Refetch projects after successful creation
        },
    })

    // Mutation to move a project between categories
    const moveProjectMutation = useMutation<
        void,
        Error,
        { projectIdx: number; newCategoryIdx: number }
    >({
        mutationFn: async (data) => {
            return await axios.put(`/api/projects/${data.projectIdx}/move`, {
                newCategoryIdx: data.newCategoryIdx,
            })
        },
        onSuccess: () => {
            refetch() // Refetch projects after successful move
        },
        onError: (error: Error) => {
            console.error('Project move failed:', error.message)
        },
    })

    // Handle form submission to create a project
    const handleCreateProject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const title = form.title.valueOf // Get the value directly
        const priorityIdx = form.priorityIdx.valueOf // Get the value directly

        if (!title) {
            alert('Please enter a project title.')
            return
        }

        createProjectMutation.mutate({
            title: String(title),
            categoryIdx: idx, // Use the current category index
            priorityIdx: Number(priorityIdx),
        })
    }

    // Handle drag end
    const handleOnDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result

        if (!destination) return // Exit if no destination

        const draggedProjectIdx = Number(draggableId) // Use the draggableId as the project index
        const newCategoryIdx = Number(destination.droppableId) // ID of the new category

        // Only move if the project is being dragged to a different category
        if (newCategoryIdx !== idx) {
            moveProjectMutation.mutate({
                projectIdx: draggedProjectIdx,
                newCategoryIdx,
            })
        }
    }

    return (
        <>
            <nav className="flex flex-row justify-between p-[10px] pl-[20px] pr-[20px] bg-white bg-opacity-5">
                <div className="flex flex-row gap-[10px]">
                    <div className="relative flex flex-col gap-0 items-start w-[30px] h-[30px] mt-[8px] overflow-hidden">
                        <Image
                            src="/assets/images/profile.png"
                            fill
                            alt="Profile picture"
                            className="object-fill"
                        />
                    </div>
                    <p className="text-[18px] mt-[7px]">
                        USER: {me.data?.data?.nickname}
                    </p>
                </div>
                <div className="flex flex-row mt-[10px] text-[18px] gap-[30px]">
                    <Link href="/">
                        <button>HOME</button>
                    </Link>
                    <Link href="/signUp">
                        <button>Sign Up</button>
                    </Link>
                </div>
            </nav>

            <div>
                <h1>Category {categoryIdx} Projects</h1>
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId={String(idx)}>
                        {(provided) => (
                            <ul
                                className="project-list"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {projects?.map((project, index) => (
                                    <Draggable
                                        key={project.projectIdx}
                                        draggableId={String(project.projectIdx)}
                                        index={index}
                                    >
                                        {(provided) => (
                                            <li
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="task"
                                            >
                                                <div>{project.title}</div>
                                            </li>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </ul>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Project creation form */}
            <form onSubmit={handleCreateProject}>
                <div className="write text-white mb-0 text-[35px]">WRITE</div>
                <label htmlFor="title"></label>
                <input
                    className="text-black"
                    type="text"
                    id="title"
                    name="title"
                    placeholder="TITLE"
                    required
                />
                <label htmlFor="priorityIdx"></label>
                <input
                    className="text-black"
                    type="text"
                    id="priorityIdx"
                    name="priorityIdx"
                    placeholder="Priority Index"
                    required
                />
                <button type="submit">Create Project</button>
            </form>
        </>
    )
}
